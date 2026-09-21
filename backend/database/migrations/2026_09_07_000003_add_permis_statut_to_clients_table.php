<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->string('permis_statut')->default('en_attente')->after('permis_conduire');
            $table->text('permis_rejet_motif')->nullable()->after('permis_statut');
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn(['permis_statut', 'permis_rejet_motif']);
        });
    }
};
