<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Justificatif d'un paiement par virement ou transfert d'especes.
     *
     * Le fichier est stocke sur le disque prive configure (RECEIPT_DISK :
     * storage/app/private en local, bucket Tigris en production). Un recu
     * contient souvent le nom du client et les references de son operation.
     * Il n'a donc pas sa place dans storage/app/public, servi sans
     * authentification.
     */
    public function up(): void
    {
        Schema::table('paiements', function (Blueprint $table) {
            $table->string('recu_path')->nullable();
            $table->string('recu_nom_original')->nullable();
            $table->string('recu_mime', 100)->nullable();
            $table->unsignedInteger('recu_taille')->nullable();
            $table->timestamp('recu_envoye_le')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('paiements', function (Blueprint $table) {
            $table->dropColumn([
                'recu_path',
                'recu_nom_original',
                'recu_mime',
                'recu_taille',
                'recu_envoye_le',
            ]);
        });
    }
};
