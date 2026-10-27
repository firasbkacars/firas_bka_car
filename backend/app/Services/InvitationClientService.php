<?php

namespace App\Services;

use App\Mail\InvitationCompte;
use App\Models\Client;
use App\Support\QueuedMail;
use Illuminate\Support\Str;

/**
 * Activation des comptes crees par un agent (reservation par telephone).
 *
 * L'agent n'a pas a choisir un mot de passe a la place du client : un lien
 * a usage unique, valable sept jours, permet au client de definir le sien.
 */
class InvitationClientService
{
    public const VALIDITE_JOURS = 7;

    /**
     * Genere un nouveau lien et l'envoie par email.
     *
     * @return bool true si l'email a ete mis en file.
     */
    public function envoyer(Client $client): bool
    {
        if (empty($client->email) || ! empty($client->password)) {
            return false;
        }

        $token = Str::random(64);

        $client->forceFill([
            'invitation_token' => hash('sha256', $token),
            'invitation_expire_le' => now()->addDays(self::VALIDITE_JOURS),
        ])->save();

        $base = rtrim((string) config('app.frontend_url', config('app.url')), '/');

        return QueuedMail::send(
            $client->email,
            new InvitationCompte($client, $base.'/client/activer/'.$token),
            'invitation-compte'
        );
    }

    /**
     * Retrouve le client detenteur d'un lien encore valide.
     */
    public function trouverParToken(string $token): ?Client
    {
        if ($token === '') {
            return null;
        }

        return Client::query()
            ->where('invitation_token', hash('sha256', $token))
            ->whereNotNull('invitation_expire_le')
            ->where('invitation_expire_le', '>', now())
            ->first();
    }

    /**
     * Definit le mot de passe et invalide le lien (usage unique).
     */
    public function activer(Client $client, string $motDePasse): Client
    {
        $client->forceFill([
            'password' => $motDePasse,
            // Le client vient de prouver qu'il controle l'adresse email.
            'email_verified_at' => now(),
            'invitation_token' => null,
            'invitation_expire_le' => null,
        ])->save();

        if (empty($client->code_parrainage)) {
            app(ParrainageService::class)->genererCode($client);
        }

        return $client->fresh();
    }
}
