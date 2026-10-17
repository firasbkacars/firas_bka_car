<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Avi;
use App\Models\Client;
use App\Models\Message;
use App\Models\Paiement;
use App\Models\Reservation;
use Illuminate\Http\Request;

/**
 * Indices de nouveaute (badges).
 *
 * Admin : nouvelles reservations / nouveaux clients (depuis la derniere
 * consultation des listes), messages clients non lus, paiements a traiter
 * (en attente ou suspects), avis a moderer.
 *
 * Client : messages non lus de l'admin, reservations modifiees (statut,
 * paiement, caution...) depuis la derniere consultation de ses reservations.
 */
class NotificationController extends Controller
{
    /** Compteurs de la partie admin (sidebar). */
    public function adminCounts(Request $request)
    {
        $user = $request->user();

        // Premiere consultation : la reference "vu" est posee maintenant pour
        // ne pas afficher tout l'historique en pastille.
        if (! $user->reservations_vues_le || ! $user->clients_vus_le) {
            $user->update([
                'reservations_vues_le' => $user->reservations_vues_le ?: now(),
                'clients_vus_le' => $user->clients_vus_le ?: now(),
            ]);
        }

        // Sans horodatage : l'historique existant est considere comme vu
        // (sinon le badge afficherait toutes les donnees a la connexion).
        $reservations = $user->reservations_vues_le
            ? Reservation::where('created_at', '>', $user->reservations_vues_le)->count()
            : 0;

        $clients = $user->clients_vus_le
            ? Client::where('created_at', '>', $user->clients_vus_le)->count()
            : 0;

        $messages = Message::where('from_admin', false)->whereNull('read_at')->count();

        $paiements = Paiement::whereIn('statut', [
            Paiement::STATUT_EN_ATTENTE,
            Paiement::STATUT_SUSPECT,
        ])->count();

        $avis = Avi::where('statut', 'en_attente')->count();

        return response()->json(compact('reservations', 'clients', 'messages', 'paiements', 'avis'));
    }

    /** Marque la liste des reservations admin comme vue. */
    public function reservationsVuesAdmin(Request $request)
    {
        $request->user()->update(['reservations_vues_le' => now()]);

        return response()->json(['ok' => true]);
    }

    /** Marque la liste des clients admin comme vue. */
    public function clientsVusAdmin(Request $request)
    {
        $request->user()->update(['clients_vus_le' => now()]);

        return response()->json(['ok' => true]);
    }

    /** Compteurs de la partie client (menu utilisateur). */
    public function clientCounts(Request $request)
    {
        $client = $request->user();

        // Premiere consultation : reference "vu" posee maintenant pour ne pas
        // signaler l'historique comme nouveau.
        if (! $client->reservations_vues_le) {
            $client->update(['reservations_vues_le' => now()]);
        }

        $messages = Message::where('client_id', $client->id)
            ->where('from_admin', true)
            ->whereNull('read_at')
            ->count();

        $reservations = $client->reservations_vues_le
            ? Reservation::where('client_id', $client->id)
                ->where('updated_at', '>', $client->reservations_vues_le)
                ->count()
            : 0;

        return response()->json(compact('messages', 'reservations'));
    }

    /** Marque les reservations du client comme vues. */
    public function reservationsVuesClient(Request $request)
    {
        $request->user()->update(['reservations_vues_le' => now()]);

        return response()->json(['ok' => true]);
    }
}
