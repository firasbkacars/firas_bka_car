<?php

namespace App\Support;

use Illuminate\Contracts\Mail\Mailable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Envoi d'email journalise et mis en file, qui ne fait JAMAIS echouer la
 * requete metier.
 *
 * Un envoi synchrone (`Mail::send`) dans un controleur signifie qu'une
 * indisponibilite SMTP se transforme en 500 pour l'utilisateur : c'est ce
 * qui faisait echouer le formulaire de contact et la demande de verification
 * d'email. Ici l'envoi part sur la file et toute anomalie (file indisponible,
 * SMTP refuse, mailable invalide) est journalisee puis avalee.
 */
class QueuedMail
{
    /**
     * @param  string  $to  Adresse du destinataire.
     * @param  Mailable  $mailable  Le mailable a mettre en file.
     * @param  string  $contexte  Libelle present dans le journal d'erreur.
     * @return bool true si l'envoi a ete mis en file.
     */
    public static function send(string $to, Mailable $mailable, string $contexte): bool
    {
        try {
            Mail::to($to)->queue($mailable);

            return true;
        } catch (\Throwable $e) {
            Log::error("Echec de la mise en file d'un email [{$contexte}]", [
                'to' => $to,
                'exception' => $e::class,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }
}
