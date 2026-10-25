<?php

namespace App\Console\Commands;

use App\Mail\TestMail;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Diagnostic SMTP : envoie un email immediatement et affiche l'erreur reelle
 * en cas d'echec. Indispensable pour verifier un mot de passe d'application
 * Gmail sans attendre qu'un vrai client declenche une reservation.
 */
class TesterEmail extends Command
{
    protected $signature = 'mail:test {destinataire? : Adresse qui recevra le message de test}';

    protected $description = 'Verifie la configuration SMTP en envoyant un email de test';

    public function handle(): int
    {
        $destinataire = $this->argument('destinataire') ?: config('mail.admin_address');

        if (! is_string($destinataire) || ! filter_var($destinataire, FILTER_VALIDATE_EMAIL)) {
            $this->error('Adresse destinataire invalide : '.var_export($destinataire, true));

            return self::FAILURE;
        }

        $transport = (string) config('mail.default');
        $host = (string) config("mail.mailers.{$transport}.host", '');
        $port = (string) config("mail.mailers.{$transport}.port", '');
        $serveur = trim($host.':'.$port, ':');
        $expediteur = (string) config('mail.from.address');
        $utilisateur = (string) config("mail.mailers.{$transport}.username");

        $this->table(['Parametre', 'Valeur'], [
            ['Transport', $transport],
            ['Serveur', $serveur !== '' ? $serveur : '(non defini)'],
            ['Expediteur', $expediteur],
            ['Destinataire', $destinataire],
            ['Utilisateur SMTP', $utilisateur !== '' ? $utilisateur : '(non defini)'],
        ]);

        try {
            Mail::to($destinataire)->send(new TestMail($transport, $serveur, $expediteur));
        } catch (Throwable $e) {
            $this->newLine();
            $this->error("Echec de l'envoi : ".$e->getMessage());

            return self::FAILURE;
        }

        $this->newLine();
        $this->info("Email de test envoye a {$destinataire}.");

        return self::SUCCESS;
    }
}
