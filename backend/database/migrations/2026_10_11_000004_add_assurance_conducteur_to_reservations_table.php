<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->boolean('assurance_conducteur_additionnel')->default(false)->after('supplement_conducteur');
            $table->decimal('montant_retenu_caution', 8, 2)->default(0)->after('motif_rejet_caution');
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropColumn(['assurance_conducteur_additionnel', 'montant_retenu_caution']);
        });
    }
};
