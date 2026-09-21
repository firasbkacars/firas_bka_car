<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    private string $phoneNumberId;
    private string $accessToken;
    private string $apiVersion;

    public function __construct()
    {
        $this->phoneNumberId = config('services.whatsapp.phone_number_id');
        $this->accessToken = config('services.whatsapp.access_token');
        $this->apiVersion = config('services.whatsapp.api_version', 'v18.0');
    }

    public function sendTextMessage(string $to, string $message): ?array
    {
        $response = Http::withToken($this->accessToken)
            ->post("https://graph.facebook.com/{$this->apiVersion}/{$this->phoneNumberId}/messages", [
                'messaging_product' => 'whatsapp',
                'to' => $to,
                'type' => 'text',
                'text' => [
                    'body' => $message,
                ],
            ]);

        if ($response->successful()) {
            return $response->json();
        }

        Log::error('WhatsApp send failed', [
            'status' => $response->status(),
            'body' => $response->body(),
        ]);

        return null;
    }

    public function sendTemplateMessage(string $to, string $templateName, string $languageCode = 'fr', array $components = []): ?array
    {
        $payload = [
            'messaging_product' => 'whatsapp',
            'to' => $to,
            'type' => 'template',
            'template' => [
                'name' => $templateName,
                'language' => [
                    'code' => $languageCode,
                ],
            ],
        ];

        if (!empty($components)) {
            $payload['template']['components'] = $components;
        }

        $response = Http::withToken($this->accessToken)
            ->post("https://graph.facebook.com/{$this->apiVersion}/{$this->phoneNumberId}/messages", $payload);

        if ($response->successful()) {
            return $response->json();
        }

        Log::error('WhatsApp template failed', [
            'status' => $response->status(),
            'body' => $response->body(),
        ]);

        return null;
    }

    public function handleIncomingMessage(array $payload): void
    {
        $entry = $payload['entry'][0] ?? null;
        $changes = $entry['changes'][0] ?? null;
        $value = $changes['value'] ?? null;
        $messages = $value['messages'] ?? [];

        foreach ($messages as $message) {
            $from = $message['from'];
            $messageBody = $message['text']['body'] ?? '';

            $this->processMessage($from, $messageBody);
        }
    }

    private function processMessage(string $phone, string $message): void
    {
        $lowerMessage = strtolower(trim($message));

        $responses = [
            'bonjour' => "Bonjour ! Bienvenue chez FIRAS BKA CAR. Comment puis-je vous aider ?\n\n1. Verifier disponibilite\n2. Reserver un vehicule\n3. Annuler une reservation\n4. Parler a un agent",
            'salut' => "Salut ! Comment puis-je vous aider ?\n\n1. Verifier disponibilite\n2. Reserver un vehicule\n3. Annuler une reservation\n4. Parler a un agent",
            'aide' => "Voici ce que je peux faire pour vous :\n\n1. Verifier la disponibilite d'un vehicule\n2. Vous aider a reserver\n3. Gérer votre reservation\n4. Vous mettre en contact avec un agent",
            'dispo' => "Pour verifier la disponibilite, veuillez me preciser :\n- La date de debut (JJ/MM/AAAA)\n- La date de fin (JJ/MM/AAAA)\n- Le type de vehicule souhaite",
            'reserver' => "Pour reserver, rendez-vous sur notre site :\nhttps://firasbkacar.com/vehicules\n\nOu dites-moi vos dates pour verifier la disponibilite.",
            'annuler' => "Pour annuler une reservation, veuillez me communiquer votre numero de reservation (format: FBC-XX-XXXXX).",
            'agent' => "Un agent va vous repondre dans les plus brefs delais.\n\nHoraires : 8h-20h, 7j/7\nTelephone : +212 6 00 00 00 00",
            'merci' => "Avec plaisir ! N'hesitez pas si vous avez d'autres questions.",
            'au revoir' => "Au revoir et merci de votre confiance !",
            'bonsoir' => "Bonsoir ! Bienvenue chez FIRAS BKA CAR. Comment puis-je vous aider ?",
        ];

        $reply = null;
        foreach ($responses as $keyword => $response) {
            if (str_contains($lowerMessage, $keyword)) {
                $reply = $response;
                break;
            }
        }

        if (!$reply) {
            $reply = "Je ne suis pas sur de comprendre. Voici les options disponibles :\n\n1. Verifier disponibilite\n2. Reserver un vehicule\n3. Annuler une reservation\n4. Parler a un agent";
        }

        $this->sendTextMessage($phone, $reply);
    }
}
