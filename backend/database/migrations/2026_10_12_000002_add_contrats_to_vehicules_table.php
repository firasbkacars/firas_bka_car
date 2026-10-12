<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vehicules', function (Blueprint $table) {
            // G1 : expiration de l'assurance du vehicule.
            $table->date('date_expiration_assurance')->nullable()->after('montant_caution');
            // G2 : expiration de la carte grise (visite technique).
            $table->date('date_expiration_carte_grise')->nullable()->after('date_expiration_assurance');
            // Marqueurs d'envoi : un seul rappel par contrat et par expiration.
            $table->date('assurance_rappel_envoye_le')->nullable()->after('date_expiration_carte_grise');
            $table->date('carte_grise_rappel_envoye_le')->nullable()->after('assurance_rappel_envoye_le');
        });
    }

    public function down(): void
    {
        Schema::table('vehicules', function (Blueprint $table) {
            $table->dropColumn([
                'date_expiration_assurance',
                'date_expiration_carte_grise',
                'assurance_rappel_envoye_le',
                'carte_grise_rappel_envoye_le',
            ]);
        });
    }
};
