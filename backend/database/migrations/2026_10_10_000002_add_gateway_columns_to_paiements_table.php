<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('paiements', function (Blueprint $table) {
            // Identifiant de transaction cote passerelle. Stocke ds l'initiation
            // puis reutilise au webhook: evite le parsing fragile du numero.
            $table->string('transaction_id')->nullable()->index();

            $table->string('reference_externe')->nullable();
            $table->string('gateway')->default('cmi')->index();
            $table->string('devise')->default('MAD');

            // acompte | solde | complement | caution | remboursement
            $table->string('type')->default('acompte')->index();

            $table->string('code_erreur_gateway')->nullable();
            $table->text('message_erreur')->nullable();

            // On ne conserve que la marque et les 4 derniers chiffres.
            // Aucune donnee de carte brute (PCI-DSS SAQ A).
            $table->string('carte_marque')->nullable();
            $table->char('carte_derniers4', 4)->nullable();

            $table->string('client_ip', 45)->nullable();

            // Empeche un double encaissement si un meme init est rejoue.
            $table->string('idempotency_key')->nullable()->unique();

            $table->unsignedInteger('tentatives')->default(0);
            $table->timestamp('initie_le')->nullable();
            $table->timestamp('verifie_le')->nullable();

            $table->timestamp('rembourse_le')->nullable();
            $table->string('rembourse_transaction_id')->nullable();
            // Lien vers l'encaissement d'origine qu'une ecriture de
            // remboursement compense.
            $table->foreignId('paiement_source_id')->nullable()
                ->constrained('paiements')->nullOnDelete();

            $table->text('note_admin')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();

            // Anti double-encaissement: une transaction CMI ne peut aboutir
            // qu'une seule fois pour une reservation donnee.
            $table->unique(['reservation_id', 'transaction_id']);
        });
    }

    public function down(): void
    {
        Schema::table('paiements', function (Blueprint $table) {
            $table->dropUnique(['reservation_id', 'transaction_id']);
            $table->dropIndex(['idempotency_key']);
            $table->dropIndex(['transaction_id']);
            $table->dropIndex(['gateway']);
            $table->dropIndex(['type']);

            $table->dropColumn([
                'transaction_id', 'reference_externe', 'gateway', 'devise', 'type',
                'code_erreur_gateway', 'message_erreur', 'carte_marque', 'carte_derniers4',
                'client_ip', 'idempotency_key', 'tentatives', 'initie_le', 'verifie_le',
                'rembourse_le', 'rembourse_transaction_id', 'paiement_source_id',
                'note_admin', 'created_by',
            ]);
        });
    }
};
