<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WhatsAppMessage;
use App\Services\WhatsAppService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WhatsAppController extends Controller
{
    private WhatsAppService $whatsapp;

    public function __construct(WhatsAppService $whatsapp)
    {
        $this->whatsapp = $whatsapp;
    }

    public function webhook(Request $request)
    {
        if ($request->isMethod('get')) {
            $mode = $request->query('hub_mode');
            $token = $request->query('hub_verify_token');
            $challenge = $request->query('hub_challenge');

            $verifyToken = config('services.whatsapp.verify_token');

            if ($mode === 'subscribe' && $token === $verifyToken) {
                return response($challenge, 200)->header('Content-Type', 'text/plain');
            }

            return response('Forbidden', 403);
        }

        $appSecret = config('services.whatsapp.app_secret');
        $signature = $request->header('X-Hub-Signature-256');

        if (empty($appSecret)) {
            Log::error('WhatsApp webhook called but WHATSAPP_APP_SECRET is not configured');
            return response()->json(['error' => 'Webhook not configured'], 500);
        }

        if (empty($signature)) {
            Log::warning('WhatsApp webhook missing signature');
            return response()->json(['error' => 'Missing signature'], 401);
        }

        $rawPayload = file_get_contents('php://input');
        $expectedSignature = 'sha256=' . hash_hmac('sha256', $rawPayload, $appSecret);

        if (!hash_equals($expectedSignature, $signature)) {
            Log::warning('WhatsApp webhook signature mismatch');
            return response()->json(['error' => 'Invalid signature'], 403);
        }

        $payload = $request->all();

        Log::info('WhatsApp webhook received', ['payload' => $payload]);

        try {
            $this->whatsapp->handleIncomingMessage($payload);
        } catch (\Exception $e) {
            Log::error('WhatsApp webhook error', ['error' => $e->getMessage()]);
        }

        return response()->json(['status' => 'ok']);
    }

    public function sendMessage(Request $request)
    {
        $validated = $request->validate([
            'phone' => 'required|string',
            'message' => 'required|string|max:1000',
        ]);

        $result = $this->whatsapp->sendTextMessage(
            $validated['phone'],
            $validated['message']
        );

        WhatsAppMessage::create([
            'phone' => $validated['phone'],
            'message' => $validated['message'],
            'direction' => 'outgoing',
            'sent' => $result !== null,
        ]);

        return response()->json([
            'success' => $result !== null,
            'result' => $result,
        ]);
    }

    public function conversations()
    {
        $messages = WhatsAppMessage::selectRaw('phone, MAX(created_at) as last_message_at, COUNT(*) as message_count')
            ->groupBy('phone')
            ->orderBy('last_message_at', 'desc')
            ->get();

        return response()->json($messages);
    }

    public function conversation(Request $request, string $phone)
    {
        $messages = WhatsAppMessage::where('phone', $phone)
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json($messages);
    }
}
