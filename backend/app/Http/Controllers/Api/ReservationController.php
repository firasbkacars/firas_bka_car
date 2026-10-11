<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreReservationRequest;
use App\Jobs\SendReservationConfirmation;
use App\Mail\AdminNewReservation;
use App\Models\CodePromo;
use App\Models\Paiement;
use App\Models\Parametre;
use App\Models\Reservation;
use App\Models\User;
use App\Models\Vehicule;
use App\Services\FideliteService;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ReservationController extends Controller
{
    public function index(Request $request)
    {
        $query = Reservation::with(['client', 'vehicule']);

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
                'agence_id' => $validated['agence_id'] ?? null,
                'date_debut' => $validated['date_debut'],
                'date_fin' => $validated['date_fin'],
                'lieu_prise' => $validated['lieu_prise'],
                'lieu_retour' => $validated['lieu_retour'],
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
                'supplement_conducteur' => $supplementConducteur,
            ]);

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

        $reservation->load(['client', 'vehicule']);

        SendReservationConfirmation::dispatch($reservation->id);

        $adminEmail = config('mail.from.address', 'firasbkacars@gmail.com');
        try {
            Mail::to($adminEmail)->send(new AdminNewReservation($reservation));
        } catch (\Exception $e) {
            Log::error('Failed to send admin notification', ['error' => $e->getMessage()]);
        }

        return response()->json($reservation, 201);
    }

    public function show(Request $request, $numero)
    {
        $reservation = Reservation::with(['client', 'vehicule', 'paiements', 'etatsLieux'])
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

        $reservations = Reservation::with(['vehicule', 'paiements'])
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
        }

        return response()->json($reservation->load(['client', 'vehicule']));
    }

    public function annuler($id)
    {
        $reservation = Reservation::findOrFail($id);
        $reservation->update(['statut' => 'annulee']);

        return response()->json(['message' => 'Reservation annulee']);
    }

    public function updateCaution(Request $request, $id)
    {
        $validated = $request->validate([
            'caution_statut' => 'required|in:bloquee,restituee,retenue_partiellement',
            'motif_rejet_caution' => 'nullable|string|max:500',
        ]);

        $reservation = Reservation::findOrFail($id);
        $reservation->update($validated);

        return response()->json([
            'message' => 'Statut de la caution mis a jour',
            'reservation' => $reservation->load(['client', 'vehicule']),
        ]);
    }

    public function annulerParClient(Request $request, $id)
    {
        $client = $request->user();
        $reservation = Reservation::where('id', $id)
            ->where('client_id', $client->id)
            ->firstOrFail();

        if (! in_array($reservation->statut, ['confirmee', 'en_cours'])) {
            return response()->json(['message' => 'Cette reservation ne peut plus etre annulee'], 422);
        }

        $montantRembourse = 0;
        $dateDebut = Carbon::parse($reservation->date_debut);
        $heuresAvant = now()->diffInHours($dateDebut, false);

        if ($heuresAvant >= 48) {
            $montantRembourse = $reservation->acompte;
        } elseif ($heuresAvant >= 24) {
            $montantRembourse = $reservation->acompte * 0.50;
        } else {
            $montantRembourse = 0;
        }

        $reservation->update([
            'statut' => 'annulee',
            'montant_rembourse' => $montantRembourse,
            'politique_annulation' => $this->getPolitiqueAnnulation($heuresAvant),
        ]);

        if ($montantRembourse > 0) {
            Paiement::create([
                'reservation_id' => $reservation->id,
                'montant' => $montantRembourse,
                'methode' => $reservation->mode_paiement,
                'statut' => 'paye',
                'date_paiement' => now(),
            ]);
        }

        return response()->json([
            'message' => 'Reservation annulee',
            'montant_rembourse' => $montantRembourse,
            'politique' => $reservation->politique_annulation,
        ]);
    }

    public function prolonger(Request $request, $id)
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
        $joursSupplementaires = $oldDateFin->diffInDays($newDateFin);

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

        return response()->json([
            'message' => 'Reservation prolongee',
            'reservation' => $reservation->load(['client', 'vehicule']),
            'jours_supplementaires' => $joursSupplementaires,
            'prix_supplement' => $prixSupplement,
        ]);
    }

    private function getPolitiqueAnnulation(float $heuresAvant): string
    {
        if ($heuresAvant >= 48) {
            return 'Annulation gratuite - Remboursement integral de l\'acompte';
        } elseif ($heuresAvant >= 24) {
            return 'Annulation partielle - Remboursement de 50% de l\'acompte';
        }

        return 'Annulation tardive - Acompte non remboursable';
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
