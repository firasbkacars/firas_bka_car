<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // G4 : seuil de kilometrage + marqueur pour ne pas re-alerter.
        Schema::table('vehicules', function (Blueprint $table) {
            $table->integer('kilometrage_alerte')->nullable()->after('kilometrage');
            $table->date('km_alerte_le')->nullable()->after('kilometrage_alerte');
        });

        // V6 : position GPS affichee sur carte OpenStreetMap.
        Schema::table('vehicules', function (Blueprint $table) {
            $table->decimal('latitude', 10, 7)->nullable()->after('agence_id');
            $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
        });

        // V2 : parrainage.
        Schema::table('clients', function (Blueprint $table) {
            $table->string('code_parrainage', 12)->nullable()->unique()->after('email');
            $table->foreignId('parrain_id')->nullable()->after('code_parrainage')
                ->constrained('clients')->nullOnDelete();
            $table->boolean('parrain_recompense')->default(false)->after('parrain_id');
        });

        // V9 : photos + moderation des avis.
        Schema::table('avis', function (Blueprint $table) {
            $table->string('photo_chemin')->nullable()->after('commentaire');
            $table->string('statut', 20)->default('publie')->after('photo_chemin');
        });

        // G5 : contrats fournisseurs.
        Schema::create('contrats_fournisseurs', function (Blueprint $table) {
            $table->id();
            $table->string('titre');
            $table->string('fournisseur');
            $table->string('reference')->nullable();
            $table->date('date_debut');
            $table->date('date_expiration')->nullable();
            $table->decimal('montant', 10, 2)->nullable();
            $table->foreignId('vehicule_id')->nullable()->constrained('vehicules')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->date('rappel_envoye_le')->nullable();
            $table->timestamps();
        });

        // V8 : messagerie client <-> admin.
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->boolean('from_admin')->default(false);
            $table->text('message');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');
        Schema::dropIfExists('contrats_fournisseurs');

        Schema::table('avis', function (Blueprint $table) {
            $table->dropColumn(['photo_chemin', 'statut']);
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->dropConstrainedForeignId('parrain_id');
            $table->dropColumn('code_parrainage');
        });

        Schema::table('vehicules', function (Blueprint $table) {
            $table->dropColumn(['latitude', 'longitude', 'kilometrage_alerte', 'km_alerte_le']);
        });
    }
};
