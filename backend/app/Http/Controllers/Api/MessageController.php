<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\MessageAdmin;
use App\Models\Client;
use App\Models\Message;
use App\Support\QueuedMail;
use Illuminate\Http\Request;

/** V8 : messagerie client <-> admin (polling cote frontend). */
class MessageController extends Controller
{
    /** Vue client : historique complet, non lus = messages admin. */
    public function indexClient(Request $request)
    {
        $client = $request->user();

        $messages = Message::where('client_id', $client->id)
            ->orderBy('created_at', 'asc')
            ->get();

        // Marquer les messages admin comme lus.
        Message::where('client_id', $client->id)
            ->where('from_admin', true)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json($messages);
    }

    /** Vue client : envoi d'un message vers l'admin. */
    public function storeClient(Request $request)
    {
        $validated = $request->validate([
            'message' => 'required|string|max:2000',
        ]);

        $message = Message::create([
            'client_id' => $request->user()->id,
            'from_admin' => false,
            'message' => $validated['message'],
        ]);

        // Copie email a l'admin (best effort, jamais bloquant).
        QueuedMail::send(config('mail.admin_address'), new MessageAdmin($request->user(), $validated['message']), 'message-client');

        return response()->json($message, 201);
    }

    /** Vue admin : liste des clients avec derniere activite. */
    public function indexAdmin()
    {
        $clients = Client::query()
            ->select('clients.*')
            ->selectRaw('(SELECT MAX(created_at) FROM messages WHERE messages.client_id = clients.id) as derniere_activite')
            ->selectRaw('(SELECT COUNT(*) FROM messages WHERE messages.client_id = clients.id AND from_admin = ? AND read_at IS NULL) as non_lus', [false])
            ->orderByRaw('(SELECT MAX(created_at) FROM messages WHERE messages.client_id = clients.id) DESC')
            ->get();

        return response()->json($clients);
    }

    /** Vue admin : fil de discussion avec un client. */
    public function filAdmin($clientId)
    {
        $client = Client::findOrFail($clientId);

        Message::where('client_id', $clientId)
            ->where('from_admin', false)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json([
            'client' => $client,
            'messages' => Message::where('client_id', $clientId)->orderBy('created_at', 'asc')->get(),
        ]);
    }

    /** Vue admin : reponse a un client. */
    public function storeAdmin(Request $request, $clientId)
    {
        Client::findOrFail($clientId);

        $validated = $request->validate([
            'message' => 'required|string|max:2000',
        ]);

        // Le message nait non lu : il sera marque lu quand le client
        // ouvrira sa messagerie (indice de nouveaute cote client).
        $message = Message::create([
            'client_id' => $clientId,
            'from_admin' => true,
            'message' => $validated['message'],
        ]);

        return response()->json($message, 201);
    }
}
