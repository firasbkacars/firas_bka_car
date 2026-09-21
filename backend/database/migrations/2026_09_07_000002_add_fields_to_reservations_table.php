<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->decimal('montant_caution', 8, 2)->default(0)->after('acompte');
            $table->string('caution_statut')->default('non_bloquee')->after('montant_caution');
            $table->text('motif_rejet_caution')->nullable()->after('caution_statut');
            $table->string('politique_annulation')->nullable()->after('motif_rejet_caution');
            $table->decimal('montant_rembourse', 8, 2)->default(0)->after('politique_annulation');
            $table->string('conducteur_additionnel_nom')->nullable()->after('montant_rembourse');
            $table->string('conducteur_additionnel_telephone')->nullable()->after('conducteur_additionnel_nom');
            $table->string('conducteur_additionnel_permis')->nullable()->after('conducteur_additionnel_telephone');
            $table->decimal('supplement_conducteur', 8, 2)->default(0)->after('conducteur_additionnel_permis');
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropColumn([
                'montant_caution', 'caution_statut', 'motif_rejet_caution',
                'politique_annulation', 'montant_rembourse',
                'conducteur_additionnel_nom', 'conducteur_additionnel_telephone',
                'conducteur_additionnel_permis', 'supplement_conducteur',
            ]);
        });
    }
};
