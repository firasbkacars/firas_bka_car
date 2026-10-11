<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Historiquement, choisir "visa" ou "mastercard" au moment de la
     * reservation marquait l'acompte comme 'paye' SANS AUCUN encaissement
     * reel (ReservationController). Ces enregistrements sont comptabilises
     * a tort dans les revenus (DashboardController somme les 'paye').
     *
     * On re classe ces paiements en 'cmi' + 'en_attente' et on retire la date
     * de paiement, puis on laisse l'admin re-saisir ou encaisser le veritable
     * montant. Seuls les paiements saisis manuellement par un admin
     * (reference transaction nulle, methode especes/cmi) sont conserves tels quels.
     */
    public function up(): void
    {
        DB::table('paiements')
            ->where(function ($q) {
                $q->where('methode', 'visa')->orWhere('methode', 'mastercard');
            })
            ->update([
                'methode' => 'cmi',
                'statut' => 'en_attente',
                'date_paiement' => null,
            ]);
    }

    public function down(): void
    {
        // Irreversible : on ne peut pas distinguer ce qui a ete vraiment paye.
    }
};
