<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('maintenances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vehicule_id')->constrained()->onDelete('cascade');
            $table->string('type'); // vidange, controle technique, assurance, pneus, freins, etc.
            $table->text('description')->nullable();
            $table->date('date_prevue');
            $table->date('date_realisee')->nullable();
            $table->decimal('cout', 8, 2)->nullable();
            $table->string('statut')->default('prevue'); // prevue, en_cours, terminee
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maintenances');
    }
};
