<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->index('statut');
            $table->index('code_promo');
            $table->index(['vehicule_id', 'statut', 'date_debut', 'date_fin']);
        });

        Schema::table('paiements', function (Blueprint $table) {
            $table->index('statut');
            $table->index('date_paiement');
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropIndex(['statut']);
            $table->dropIndex(['code_promo']);
            $table->dropIndex(['vehicule_id', 'statut', 'date_debut', 'date_fin']);
        });

        Schema::table('paiements', function (Blueprint $table) {
            $table->dropIndex(['statut']);
            $table->dropIndex(['date_paiement']);
        });
    }
};
