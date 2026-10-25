<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            // Nationalite declaree : les Marocains fournissent une CIN, les
            // etrangers un passeport. Le permis reste obligatoire pour tous.
            $table->boolean('est_etranger')->default(false)->after('passeport');

            $table->string('carte_nationale')->nullable()->after('est_etranger');
            $table->string('carte_nationale_statut')->default('en_attente')->after('carte_nationale');
            $table->text('carte_nationale_rejet_motif')->nullable()->after('carte_nationale_statut');

            // `passeport` reste le numero saisi par le client ; le fichier
            // image est stocke dans une colonne distincte.
            $table->string('passeport_document')->nullable()->after('carte_nationale_rejet_motif');
            $table->string('passeport_statut')->default('en_attente')->after('passeport_document');
            $table->text('passeport_rejet_motif')->nullable()->after('passeport_statut');
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn([
                'est_etranger',
                'carte_nationale',
                'carte_nationale_statut',
                'carte_nationale_rejet_motif',
                'passeport_document',
                'passeport_statut',
                'passeport_rejet_motif',
            ]);
        });
    }
};
