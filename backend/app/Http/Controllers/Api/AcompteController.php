<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Paiement;
use App\Models\Parametre;
use App\Models\Reservation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AcompteController extends Controller
{
    /**
     * Donnees reelles de la reservation + coordonnees de paiement configurees.
     *
     * Aucune coordonnee bancaire n'est inventee : si une valeur manque dans
     * config/entreprise.php, `disponible` passe a false et le frontend
     * affiche le contact de l'agence a la place.
     */
    public function show(Request $request, $numero)
    {
        $reservation = $this->reservationDuClient($request, $numero);

        return response()->json($this->payload($reservation));
    }

    /**
     * Depot du justificatif (virement ou Wafacash / Cash Plus).
     *
     * Le fichier part sur le disque prive configure (RECEIPT_DISK) et n'est
     * accessible que par une route authentifiee (client proprietaire ou
     * admin).
     */
    public function uploadRecu(Request $request, $numero)
    {
        $reservation = $this->reservationDuClient($request, $numero);

        if ($reservation->statut === 'annulee') {
            return response()->json([
                'message' => 'Cette reservation est annulee : aucun acompte ne peut etre envoye.',
            ], 422);
        }

        if ((float) $reservation->acompte <= 0) {
            return response()->json([
                'message' => 'Aucun acompte n\'est requis pour cette reservation.',
            ], 422);
        }

        if ((float) $reservation->acompte_restant <= 0.009) {
            return response()->json([
                'message' => 'Votre acompte est deja regle.',
            ], 422);
        }

        $validated = $request->validate([
            'recu' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
            'methode' => ['required', 'in:virement,wafacash'],
        ], [
            'recu.required' => 'Selectionnez la photo ou le PDF de votre recu.',
            'recu.file' => 'Le justificatif n\'a pas pu etre lu.',
            'recu.mimes' => 'Format non accepte : envoyez un JPG, PNG ou PDF.',
            'recu.max' => 'Le justificatif depasse 5 Mo.',
            'methode.required' => 'Choisissez le mode de paiement utilise.',
            'methode.in' => 'Mode de paiement invalide.',
        ]);

        $fichier = $request->file('recu');
        $paiement = $this->paiementAcompteEnAttente($reservation);
        $disque = config('filesystems.receipts_disk', 'local');

        if (! $paiement) {
            $paiement = new Paiement([
                'reservation_id' => $reservation->id,
                'type' => Paiement::TYPE_ACOMPTE,
                'devise' => 'MAD',
                'gateway' => $validated['methode'],
            ]);
        }

        $ancienChemin = $paiement->recu_path;

        // On ecrit le nouveau fichier avant de supprimer l'ancien : un echec
        // de stockage ne doit pas detruire le recu deja transmis.
        $chemin = $fichier->store('recus/'.$reservation->id, $disque);

        if (! $chemin) {
            return response()->json([
                'message' => 'Enregistrement du justificatif impossible. Reessayez.',
            ], 500);
        }

        $paiement->fill([
            'montant' => $reservation->acompte_restant,
            'methode' => $validated['methode'],
            'gateway' => $validated['methode'],
            'statut' => Paiement::STATUT_EN_ATTENTE,
            'date_paiement' => null,
            'recu_path' => $chemin,
            'recu_nom_original' => $this->nomFichierSur($fichier->getClientOriginalName()),
            'recu_mime' => $fichier->getMimeType(),
            'recu_taille' => $fichier->getSize(),
            'recu_envoye_le' => now(),
        ]);
        $paiement->save();

        if ($ancienChemin && $ancienChemin !== $chemin && Storage::disk($disque)->exists($ancienChemin)) {
            Storage::disk($disque)->delete($ancienChemin);
        }

        return response()->json([
            'message' => 'Recu envoye. L\'agence va verifier votre paiement.',
            'acompte' => $this->payload($reservation->fresh(['vehicule', 'agence', 'paiements'])),
        ], 201);
    }

    /**
     * Le client peut relire le recu qu'il a envoye.
     */
    public function recu(Request $request, $numero)
    {
        $reservation = $this->reservationDuClient($request, $numero);
        $disque = config('filesystems.receipts_disk', 'local');

        $paiement = $reservation->paiements()
            ->whereNotNull('recu_path')
            ->latest('recu_envoye_le')
            ->latest('id')
            ->first();

        abort_unless(
            $paiement && Storage::disk($disque)->exists($paiement->recu_path),
            404,
            'Aucun recu trouve.'
        );

        return Storage::disk($disque)->response(
            $paiement->recu_path,
            $paiement->recu_nom_original ?: 'recu',
            ['Content-Type' => $paiement->recu_mime ?: 'application/octet-stream']
        );
    }

    private function reservationDuClient(Request $request, string $numero): Reservation
    {
        return Reservation::with(['vehicule', 'agence', 'paiements'])
            ->where('numero', $numero)
            ->where('client_id', $request->user()->id)
            ->firstOrFail();
    }

    /**
     * Retrouve l'ecriture d'acompte a completer.
     *
     * Un paiement CMI en attente n'est jamais modifie : la passerelle garde
     * sa transaction et le client peut revenir au paiement par carte.
     */
    private function paiementAcompteEnAttente(Reservation $reservation): ?Paiement
    {
        return $reservation->paiements()
            ->where('type', Paiement::TYPE_ACOMPTE)
            ->where('statut', Paiement::STATUT_EN_ATTENTE)
            ->whereIn('methode', [
                Paiement::METHODE_ESPECES,
                Paiement::METHODE_VIREMENT,
                Paiement::METHODE_WAFACASH,
            ])
            ->latest('id')
            ->first();
    }

    private function payload(Reservation $reservation): array
    {
        $reservation->loadMissing(['vehicule', 'agence', 'paiements']);

        $paiement = $reservation->paiements()
            ->where('type', Paiement::TYPE_ACOMPTE)
            ->whereNotNull('recu_path')
            ->latest('recu_envoye_le')
            ->latest('id')
            ->first();

        $acompte = (float) $reservation->acompte;
        $prixTotal = (float) $reservation->prix_total;

        // Le taux affiche est celui reellement applique a la reservation, pas
        // une valeur codee en dur : si le parametre change, les anciennes
        // reservations gardent leur montant.
        $taux = $prixTotal > 0
            ? round(($acompte / $prixTotal) * 100, 1)
            : (float) Parametre::getNumeric('taux_acompte', 30);

        // Moyens reellement utilisables : le frontend ne doit pas afficher
        // une carte desactivee quand la configuration est incomplete.
        $virementDisponible = filled(config('entreprise.rib'))
            && filled(config('entreprise.beneficiaire'));
        $wafacashDisponible = filled(config('entreprise.gerant'))
            && filled(config('entreprise.telephone_transfert'));

        $moyensDisponibles = array_values(array_filter([
            $virementDisponible ? 'virement' : null,
            $wafacashDisponible ? 'wafacash' : null,
        ]));

        $agence = $reservation->agence;

        return [
            'reservation' => [
                'id' => $reservation->id,
                'numero' => $reservation->numero,
                'statut' => $reservation->statut,
                'mode_paiement' => $reservation->mode_paiement,
                'prix_total' => $prixTotal,
                'acompte' => $acompte,
                'acompte_paye' => (float) $reservation->acompte_paye,
                'acompte_restant' => (float) $reservation->acompte_restant,
                'solde_restant' => (float) $reservation->solde_restant,
                'reste_apres_acompte' => max(0, $prixTotal - $acompte),
                'taux_acompte' => $taux,
                'date_debut' => $reservation->date_debut,
                'date_fin' => $reservation->date_fin,
                'lieu_prise' => $reservation->lieu_prise,
                'vehicule' => $reservation->vehicule ? [
                    'marque' => $reservation->vehicule->marque,
                    'modele' => $reservation->vehicule->modele,
                    'photo' => $reservation->vehicule->photos[0] ?? null,
                ] : null,
            ],
            'coordonnees' => [
                'virement' => [
                    'disponible' => $virementDisponible,
                    'banque' => config('entreprise.banque') ?: null,
                    'rib' => config('entreprise.rib') ?: null,
                    'beneficiaire' => config('entreprise.beneficiaire') ?: null,
                ],
                'wafacash' => [
                    'disponible' => $wafacashDisponible,
                    'beneficiaire' => config('entreprise.gerant') ?: null,
                    'cin' => config('entreprise.cin_gerant') ?: null,
                    'telephone' => config('entreprise.telephone_transfert') ?: null,
                ],
            ],
            // Etat synthetique consomme par la page "Payer l'acompte".
            'paiement' => [
                'moyens_disponibles' => $moyensDisponibles,
                'aucun_moyen_en_ligne' => $moyensDisponibles === [],
                'montant_du' => (float) $reservation->acompte_restant,
                'agence' => $agence ? [
                    'nom' => $agence->nom,
                    'adresse' => $agence->adresse,
                    'ville' => $agence->ville,
                    'telephone' => $agence->telephone,
                    'email' => $agence->email,
                ] : null,
            ],
            'recu' => $paiement ? [
                'paiement_id' => $paiement->id,
                'nom' => $paiement->recu_nom_original,
                'mime' => $paiement->recu_mime,
                'taille' => $paiement->recu_taille,
                'envoye_le' => $paiement->recu_envoye_le,
                'statut' => $paiement->statut,
                'methode' => $paiement->methode,
            ] : null,
        ];
    }

    private function nomFichierSur(?string $nom): string
    {
        $nom = trim(basename((string) $nom));

        return $nom !== '' ? mb_substr($nom, 0, 180) : 'recu';
    }
}
