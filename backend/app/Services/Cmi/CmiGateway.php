<?php

namespace App\Services\Cmi;

use App\Models\Reservation;

/**
 * Contrat d'une passerelle de paiement carte (Visa/Mastercard).
 *
 * Les implementants ne font QUE l'echange reseau avec la passerelle :
 * aucune ecriture en base. Toute la logique metier (idempotence, verrous,
 * verification de montant, statuts) vit dans CmiPaymentService.
 */
interface CmiGateway
{
    /** 'production' | 'sandbox' */
    public function mode(): string;

    /**
     * Le marchand dispose de credentials valides.
     * En sandbox, toujours vrai : permet de tester sans contrat.
     */
    public function isConfigured(): bool;

    /**
     * Ouvre une session de paiement aupres de la passerelle.
     *
     * @return array{success:bool, payment_url:?string, iframe_data:?string, error:?string}
     */
    public function initiate(Reservation $reservation, float $montant, string $transactionId): array;

    /**
     * Interroge l'etat reel d'une transaction.
     *
     * @return array{
     *     success:bool, status:string, paid:bool, amount:?float,
     *     card_brand:?string, card_last4:?string,
     *     error_code:?string, error_message:?string
     * }
     */
    public function status(string $transactionId): array;

    /**
     * Demande un remboursement a la passerelle.
     *
     * @return array{success:bool, refund_id:?string, error:?string}
     */
    public function refund(string $transactionId, float $montant): array;

    public function verifyWebhookSignature(array $payload, string $signature): bool;
}
