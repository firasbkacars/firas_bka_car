<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            // P1 : date d'expiration du permis (saisie par le client, verifiee par un agent).
            $table->date('date_expiration_permis')->nullable()->after('permis_rejet_motif');
            // P3 : marqueur d'envoi du rappel d'expiration (une seule fois).
            $table->date('permis_rappel_envoye_le')->nullable()->after('date_expiration_permis');
            // U5 : photo de profil (le frontend lisait deja ce champ).
            $table->string('photo_profil')->nullable()->after('adresse');
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn(['date_expiration_permis', 'permis_rappel_envoye_le', 'photo_profil']);
        });
    }
};
