<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreReservationRequest;
use App\Jobs\SendReservationConfirmation;
use App\Mail\AdminNewReservation;
use App\Mail\AdminReservationCancelled;
use App\Models\Agence;
use App\Models\CautionHistory;
use App\Models\CodePromo;
use App\Models\Paiement;
use App\Models\Parametre;
use App\Models\Reservation;
use App\Models\User;
use App\Models\Vehicule;
use App\Services\FideliteService;
use App\Services\RefundPolicy;
use App\Support\QueuedMail;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReservationController extends Controller
{
    public function index(Request $request)
    {
        // `paiements` est lisible cote client (historique des reglements) :
        // sans eager loading, chaque reservation declenche une requete
        // supplementaire au moment de la serialisation.
        $query = Reservation::with(['client', 'vehicule', 'agence', 'paiements']);

        if ($request->has('statut')) {
            $query->where('statut', $request->get('statut'));
        }

        $reservations = $query->orderBy('created_at', 'desc')->get();

        return response()->json($reservations);
    }

    public function store(StoreReservationRequest $request)
    {
        $client = $request->user();

        if (! $client) {
            return response()->json(['message' => 'Vous devez etre connecte pour reserver'], 401);
        }

        if (empty($client->permis_conduire)) {
            return response()->json(['message' => 'Vous devez telecharger votre permis de conduire avant de reserver'], 422);
        }

        if ($client->permis_statut !== 'valide') {
            return response()->json(['message' => 'Votre permis de conduire doit etre valide par un agent avant de reserver'], 422);
        }

        // P2 : la date d'expiration fait foi, meme si la commande quotidienne
        // n'a pas encore bascule le statut en 'expire'.
        if ($client->permisExpire()) {
            return response()->json(['message' => 'Votre permis de conduire a expire : mettez a jour sa date de validite depuis votre profil'], 422);
        }

        // Piece d'identite obligatoire : CIN pour les Marocains, passeport
        // pour les etrangers. Un document rejete ou en attente bloque aussi
        // la reservation, comme pour le permis.
        $documentIdentite = $client->documentIdentiteRequis();

        if (empty($client->{$documentIdentite['champ']})) {
            return response()->json([
                'message' => "Vous devez telecharger votre {$documentIdentite['label']} avant de reserver",
                'document_manquant' => $documentIdentite['type'],
            ], 422);
        }

        if ($client->{$documentIdentite['statut']} !== 'valide') {
            $message = "Votre {$documentIdentite['label']} doit etre {$documentIdentite['accord']} par un agent avant de reserver";

            if ($client->{$documentIdentite['statut']} === 'rejete' && $client->{$documentIdentite['motif']}) {
                $message .= ' Motif : '.$client->{$documentIdentite['motif']};
            }

            return response()->json([
                'message' => $message,
                'document_manquant' => $documentIdentite['type'],
            ], 422);
        }

        $validated = $request->validated();

        $reservation = DB::transaction(function () use ($validated, $client) {
            $vehicule = Vehicule::where('id', $validated['vehicule_id'])
                ->lockForUpdate()
                ->first();

            if (! $vehicule) {
                abort(422, 'Vehicule introuvable');
            }

            if ($vehicule->statut !== 'disponible') {
                abort(422, 'Vehicule non disponible');
            }

            // G1/G2 : la date d'expiration fait foi, meme si la commande
            // quotidienne n'a pas encore alerte l'administrateur.
            if ($vehicule->contratExpire()) {
                abort(422, 'Vehicule non louable : assurance ou carte grise expiree');
            }

            $dateDebut = Carbon::parse($validated['date_debut']);
            $dateFin = Carbon::parse($validated['date_fin']);
            $jours = (int) $dateDebut->diffInDays($dateFin);
            if ($jours < 1) {
                $jours = 1;
            }

            $conflit = Reservation::where('vehicule_id', $vehicule->id)
                ->where('statut', '!=', 'annulee')
                ->where('date_debut', '<', $dateFin)
                ->where('date_fin', '>', $dateDebut)
                ->exists();

            if ($conflit) {
                abort(422, 'Le vehicule n\'est pas disponible pour ces dates');
            }

            $prixTotal = $vehicule->prix_jour * $jours;
            $remise = 0;
            $codePromoValue = null;

            if (! empty($validated['code_promo'])) {
                $codePromo = CodePromo::where('code', strtoupper($validated['code_promo']))->first();

                if ($codePromo && $codePromo->isValid()) {
                    $remise = $codePromo->calculateDiscount($prixTotal);
                    $prixTotal = max(0, $prixTotal - $remise);
                    $codePromoValue = strtoupper($validated['code_promo']);
                    $codePromo->increment('usage_actuel');
                }
            }

            $montantCaution = $vehicule->montant_caution ?? 0;

            // Sans agence choisie, la reservation retombe sur l'agence
            // de rattachement du vehicule : lieu et agence restent coherents.
            $agenceId = $validated['agence_id'] ?? $vehicule->agence_id;
            $agence = $agenceId ? Agence::find($agenceId) : null;

            $lieuPrise = $validated['lieu_prise'];
            $lieuRetour = $validated['lieu_retour'];
            if ($agence) {
                // Lieu derive de l'agence : la valeur client ne peut pas
                // decrire un point de prise en charge qui n'existe pas.
                $lieu = trim($agence->adresse.', '.$agence->ville);
                $lieuPrise = $lieu !== '' ? $lieu : $agence->ville;
                $lieuRetour = $lieuPrise;
            }

            $supplementConducteur = 0;
            if (! empty($validated['conducteur_additionnel_nom'])) {
                $supplementParJour = Parametre::getNumeric('supplement_conducteur_jour', 50);
                $supplementConducteur = $supplementParJour * $jours;
                $prixTotal += $supplementConducteur;
            }

            // L'acompte est calcule APRES le supplement pour rester coherent avec prix_total.
            $tauxAcompte = Parametre::getNumeric('taux_acompte', 30) / 100;
            $acompte = $prixTotal * $tauxAcompte;

            $reservation = $this->createWithUniqueNumero([
                'client_id' => $client->id,
                'vehicule_id' => $vehicule->id,
                'agence_id' => $agenceId,
                'date_debut' => $validated['date_debut'],
                'date_fin' => $validated['date_fin'],
                'lieu_prise' => $lieuPrise,
                'lieu_retour' => $lieuRetour,
                'prix_total' => $prixTotal,
                'acompte' => $acompte,
                'montant_caution' => $montantCaution,
                'statut' => 'confirmee',
                'mode_paiement' => $validated['mode_paiement'],
                'notes' => $validated['notes'] ?? null,
                'code_promo' => $codePromoValue,
                'remise' => $remise,
                'conducteur_additionnel_nom' => $validated['conducteur_additionnel_nom'] ?? null,
                'conducteur_additionnel_telephone' => $validated['conducteur_additionnel_telephone'] ?? null,
                'conducteur_additionnel_permis' => $validated['conducteur_additionnel_permis'] ?? null,
                'assurance_conducteur_additionnel' => (bool) ($validated['assurance_conducteur_additionnel'] ?? false),
                'supplement_conducteur' => $supplementConducteur,
            ]);

            // C1 : la caution est bloquee des la creation de la reservation.
            if ($montantCaution > 0) {
                $reservation->update(['caution_statut' => 'bloquee']);

                CautionHistory::create([
                    'reservation_id' => $reservation->id,
                    'ancien_statut' => 'non_bloquee',
                    'nouveau_statut' => 'bloquee',
                    'montant_caution' => $montantCaution,
                    'montant_retenu' => 0,
                ]);
            }

            // Un acompte n'est JAMAIS considere paye a la creation.
            // 'especes' : encaisse a la livraison ; 'cmi' : paye uniquement
            // apres confirmation signee de la passerelle (webhook ou page retour).
            Paiement::create([
                'reservation_id' => $reservation->id,
                'montant' => $acompte,
                'methode' => $validated['mode_paiement'],
                'statut' => 'en_attente',
                'date_paiement' => null,
            ]);

            return $reservation;
        });

        $reservation->load(['client', 'vehicule', 'agence']);

        SendReservationConfirmation::dispatch($reservation->id);

        // Notification admin en file : un envoi bloquant dans la meme requete
        // ajoutait la latence SMTP a la creation de reservation.
        QueuedMail::send(
            config('mail.from.address', 'firasbkacars@gmail.com'),
            new AdminNewReservation($reservation),
            'admin-nouvelle-reservation'
        );

        return response()->json($reservation, 201);
    }

    public function show(Request $request, $numero)
    {
        $reservation = Reservation::with(['client', 'vehicule', 'agence', 'paiements', 'etatsLieux'])
            ->where('numero', $numero)
            ->firstOrFail();

        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Non autorise'], 401);
        }

        if ($user instanceof User) {
            return response()->json($reservation);
        }

        if ($reservation->client_id !== $user->id) {
            return response()->json(['message' => 'Non autorise'], 403);
        }

        return response()->json($reservation);
    }

    public function mesReservations(Request $request)
    {
        $client = $request->user();

        $reservations = Reservation::with(['vehicule', 'paiements', 'agence'])
            ->where('client_id', $client->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($reservations);
    }

    public function update(Request $request, $id)
    {
        $reservation = Reservation::findOrFail($id);

        $validated = $request->validate([
            'statut' => 'sometimes|in:confirmee,en_cours,terminee,annulee',
            'notes' => 'nullable|string|max:1000',
            'date_fin' => 'sometimes|date|after:date_debut',
        ]);

        $oldStatut = $reservation->statut;

        if (isset($validated['date_fin']) && $validated['date_fin'] !== $reservation->date_fin) {
            $newDateFin = Carbon::parse($validated['date_fin']);
            $oldDateFin = Carbon::parse($reservation->date_fin);

            if ($newDateFin->gt($oldDateFin)) {
                $joursSupplementaires = $oldDateFin->diffInDays($newDateFin);
                $vehicule = $reservation->vehicule;

                $conflit = Reservation::where('vehicule_id', $reservation->vehicule_id)
                    ->where('id', '!=', $reservation->id)
                    ->where('statut', '!=', 'annulee')
                    ->where('date_debut', '<', $newDateFin)
                    ->where('date_fin', '>', $reservation->date_fin)
                    ->exists();

                if ($conflit) {
                    return response()->json(['message' => 'Le vehicule n\'est pas disponible pour la periode etendue'], 422);
                }

                $prixSupplement = $vehicule->prix_jour * $joursSupplementaires;
                $validated['prix_total'] = $reservation->prix_total + $prixSupplement;
            }
        }

        $reservation->update($validated);

        if (isset($validated['statut']) && $validated['statut'] === 'terminee' && $oldStatut !== 'terminee') {
            $fidelite = app(FideliteService::class);
            $client = $reservation->client;

            $fidelite->incrementerLocations($client);

            $points = $fidelite->calculerPoints($client, $reservation->prix_total);
            $fidelite->ajouterPoints($client, $points);

            // V2 : bonus parrain a la premiere location terminee du filleul.
            app(\App\Services\ParrainageService::class)
                ->recompenserPremiereLocation($client->fresh(), $fidelite);
        }

        return response()->json($reservation->load(['client', 'vehicule']));
    }

    /**
     * Aperçu du montant remboursable si le client annule maintenant.
     * Le backend fait foi (le calcul existait aussi en dur dans Profil.jsx).
     */
    public function apercuAnnulation(Request $request, $id)
    {
        $client = $request->user();
        $reservation = Reservation::with('paiements')->where('id', $id)
            ->where('client_id', $client->id)
            ->firstOrFail();

        $policy = app(RefundPolicy::class);
        $heures = $policy->heuresAvantDebut($reservation);

        return response()->json([
            'annulable' => in_array($reservation->statut, ['confirmee', 'en_cours'], true),
            'heures_avant_debut' => round($heures, 1),
            'acompte_paye' => $reservation->acompte_paye,
            'montant_rembourse' => $policy->montantRemboursable($reservation, $heures),
            'politique' => $policy->libelle($heures),
        ]);
    }

    /**
     * Annulation par un admin.
     *
     * Declenche le vrai remboursement : auparavant, annuler cote admin
     * ne declarait AUCUN remboursement, alors que le client, lui, voyait
     * un "remboursement" comptabilise comme un encaissement positif.
     */
    public function annuler(Request $request, $id)
    {
        $reservation = Reservation::with('paiements')->findOrFail($id);

        if (in_array($reservation->statut, ['annulee', 'terminee'], true)) {
            return response()->json([
                'message' => 'Cette reservation ne peut plus etre annulee.',
            ], 422);
        }

        $result = app(RefundPolicy::class)->annuler(
            $reservation,
            $request->input('motif') ?? 'Annulee par un administrateur',
            $request->user()?->id
        );

        return response()->json(array_merge([
            'message' => 'Reservation annulee',
            'reservation' => $reservation->fresh(['client', 'vehicule', 'paiements']),
        ], $result));
    }

    /**
     * C3/C4 : mise a jour du statut de la caution avec historique
     * et生成 d'une ecriture de remboursement si restitution partielle/complete.
     */
    public function updateCaution(Request $request, $id)
    {
        $validated = $request->validate([
            'caution_statut' => 'required|in:bloquee,restituee,retenue_partiellement',
            'montant_retenu' => 'nullable|numeric|min:0',
            'motif_rejet_caution' => 'nullable|string|max:500',
        ]);

        $reservation = Reservation::findOrFail($id);

        if ($validated['caution_statut'] === 'retenue_partiellement') {
            if (empty($validated['motif_rejet_caution'])) {
                return response()->json(['message' => 'Un motif est obligatoire pour une retenue partielle'], 422);
            }
            if (empty($validated['montant_retenu']) || $validated['montant_retenu'] <= 0) {
                return response()->json(['message' => 'Le montant retenu doit etre superieur a 0'], 422);
            }
            if ($validated['montant_retenu'] > (float) $reservation->montant_caution) {
                return response()->json(['message' => 'Le montant retenu depasse le montant de la caution'], 422);
            }
        }

        if ($validated['caution_statut'] === 'restituee' && ! empty($validated['motif_rejet_caution'])) {
            return response()->json(['message' => 'Un motif n\'est pas attendu pour une restitution complete'], 422);
        }

        // C2 : impossible de traiter la caution sans etat des lieux de retour.
        if (in_array($validated['caution_statut'], ['restituee', 'retenue_partiellement'], true)) {
            $etatRetour = $reservation->etatsLieux()->where('type', 'retour')->exists();
            if (! $etatRetour) {
                return response()->json([
                    'message' => 'Etat des lieux de retour obligatoire avant de traiter la caution',
                ], 422);
            }
        }

        $ancienStatut = $reservation->caution_statut;
        $montantRetenu = $validated['caution_statut'] === 'retenue_partiellement'
            ? (float) $validated['montant_retenu']
            : 0;

        $reservation->update([
            'caution_statut' => $validated['caution_statut'],
            'motif_rejet_caution' => $validated['motif_rejet_caution'] ?? null,
            'montant_retenu_caution' => $montantRetenu,
        ]);

        // C4 : historique immuable de chaque changement.
        CautionHistory::create([
            'reservation_id' => $reservation->id,
            'ancien_statut' => $ancienStatut,
            'nouveau_statut' => $validated['caution_statut'],
            'montant_caution' => $reservation->montant_caution,
            'montant_retenu' => $montantRetenu,
            'motif' => $validated['motif_rejet_caution'] ?? null,
            'agent_id' => $request->user()?->id,
        ]);

        // C3 : genere l'ecriture de remboursement de la caution.
        $montantRembourse = 0;
        if (in_array($validated['caution_statut'], ['restituee', 'retenue_partiellement'], true)) {
            $montantRembourse = (float) $reservation->montant_caution - $montantRetenu;

            if ($montantRembourse > 0) {
                Paiement::create([
                    'reservation_id' => $reservation->id,
                    'montant' => -$montantRembourse,
                    'methode' => $reservation->mode_paiement === 'cmi' ? 'cmi' : 'especes',
                    'statut' => Paiement::STATUT_REMBOURSE,
                    'type' => Paiement::TYPE_REMBOURSEMENT,
                    'rembourse_le' => now(),
                    'note_admin' => 'Remboursement de la caution — '.$validated['caution_statut'],
                ]);
            }
        }

        return response()->json([
            'message' => 'Statut de la caution mis a jour',
            'montant_rembourse' => $montantRembourse,
            'reservation' => $reservation->load(['client', 'vehicule']),
        ]);
    }

    /**
     * C4 : historique des changements de caution pour une reservation.
     */
    public function cautionHistorique(Request $request, $id)
    {
        $reservation = Reservation::with('cautionHistories.agent')->findOrFail($id);

        return response()->json($reservation->cautionHistories);
    }

    public function annulerParClient(Request $request, $id)
    {
        $client = $request->user();
        $reservation = Reservation::with('paiements')->where('id', $id)
            ->where('client_id', $client->id)
            ->firstOrFail();

        if (! in_array($reservation->statut, ['confirmee', 'en_cours'])) {
            return response()->json(['message' => 'Cette reservation ne peut plus etre annulee'], 422);
        }

        // La politique s'appuie sur l'acompte REELLEMENT encaisse et produit
        // une ecriture de remboursement, plus un encaissement positif.
        $result = app(RefundPolicy::class)->annuler($reservation, 'Annulee par le client');

        $reservation->load(['client', 'vehicule']);

        // N6 : l'admin doit savoir qu'une place vient de se liberer, sans
        // attendre d'ouvrir le back-office.
        QueuedMail::send(
            config('mail.from.address', 'firasbkacars@gmail.com'),
            new AdminReservationCancelled(
                $reservation,
                (float) $result['montant_rembourse'],
                (string) $result['politique'],
            ),
            'admin-annulation-client'
        );

        return response()->json([
            'message' => 'Reservation annulee',
            'montant_rembourse' => $result['montant_rembourse'],
            'politique' => $result['politique'],
            'reservation' => $reservation->fresh(['vehicule', 'paiements']),
        ]);
    }

    /**
     * PR1/PR3 : prolongation avec complement paiement.
     * Disponible pour les reservations 'confirmee' et 'en_cours'.
     */
    public function prolonger(Request $request, $id)
    {
        $user = $request->user();

        $query = Reservation::query();
        if (! $user instanceof User) {
            $query->where('client_id', $user->id);
        }

        $reservation = $query->findOrFail($id);

        // PR1 : les reservations 'confirmee' et 'en_cours' sont prolongeables.
        if (! in_array($reservation->statut, ['confirmee', 'en_cours'], true)) {
            return response()->json(['message' => 'Seules les reservations confirmees ou en cours peuvent etre prolongees'], 422);
        }

        $validated = $request->validate([
            'date_fin' => 'required|date|after:'.$reservation->date_fin,
        ]);

        $newDateFin = Carbon::parse($validated['date_fin']);
        $oldDateFin = Carbon::parse($reservation->date_fin);
        $joursSupplementaires = (int) $oldDateFin->diffInDays($newDateFin);

        $conflit = Reservation::where('vehicule_id', $reservation->vehicule_id)
            ->where('id', '!=', $reservation->id)
            ->where('statut', '!=', 'annulee')
            ->where('date_debut', '<', $newDateFin)
            ->where('date_fin', '>', $reservation->date_fin)
            ->exists();

        if ($conflit) {
            return response()->json(['message' => 'Le vehicule n\'est pas disponible pour la periode etendue'], 422);
        }

        $vehicule = $reservation->vehicule;
        $prixSupplement = $vehicule->prix_jour * $joursSupplementaires;

        $reservation->update([
            'date_fin' => $validated['date_fin'],
            'prix_total' => $reservation->prix_total + $prixSupplement,
        ]);

        // PR3 : genere un complement en attente pour le supplement.
        Paiement::create([
            'reservation_id' => $reservation->id,
            'montant' => $prixSupplement,
            'methode' => $reservation->mode_paiement === 'cmi' ? 'cmi' : 'especes',
            'statut' => 'en_attente',
            'type' => Paiement::TYPE_COMPLEMENT,
            'note_admin' => 'Complement prolongation '.$joursSupplementaires.' jour(s)',
        ]);

        return response()->json([
            'message' => 'Reservation prolongee',
            'reservation' => $reservation->load(['client', 'vehicule']),
            'jours_supplementaires' => $joursSupplementaires,
            'prix_supplement' => $prixSupplement,
        ]);
    }

    /**
     * PR2 : apercu de prolongation (disponibilite + prix) sans validation.
     */
    public function apercuProlongation(Request $request, $id)
    {
        $user = $request->user();

        $query = Reservation::query();
        if (! $user instanceof User) {
            $query->where('client_id', $user->id);
        }

        $reservation = $query->findOrFail($id);

        $validated = $request->validate([
            'date_fin' => 'required|date|after:'.$reservation->date_fin,
        ]);

        $newDateFin = Carbon::parse($validated['date_fin']);
        $oldDateFin = Carbon::parse($reservation->date_fin);
        $joursSupplementaires = (int) $oldDateFin->diffInDays($newDateFin);

        $conflit = Reservation::where('vehicule_id', $reservation->vehicule_id)
            ->where('id', '!=', $reservation->id)
            ->where('statut', '!=', 'annulee')
            ->where('date_debut', '<', $newDateFin)
            ->where('date_fin', '>', $reservation->date_fin)
            ->exists();

        $prixSupplement = $reservation->vehicule->prix_jour * $joursSupplementaires;

        return response()->json([
            'disponible' => ! $conflit,
            'jours_supplementaires' => $joursSupplementaires,
            'prix_supplement' => $prixSupplement,
            'nouveau_prix_total' => $reservation->prix_total + $prixSupplement,
        ]);
    }

    /**
     * Cree une reservation en regenerant le numero en cas de collision
     * (index unique sur reservations.numero, generateur non atomique).
     */
    private function createWithUniqueNumero(array $attributes): Reservation
    {
        $lastException = null;

        for ($attempt = 0; $attempt < 5; $attempt++) {
            try {
                return Reservation::create(array_merge($attributes, [
                    'numero' => Reservation::genererNumero(),
                ]));
            } catch (QueryException $e) {
                $lastException = $e;

                $isUniqueViolation = (string) $e->getCode() === '23000'
                    || str_contains(strtolower($e->getMessage()), 'unique');

                if (! $isUniqueViolation) {
                    throw $e;
                }
            }
        }

        throw $lastException;
    }
}
