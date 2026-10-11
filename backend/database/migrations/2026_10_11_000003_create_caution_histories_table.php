<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('caution_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reservation_id')->constrained()->onDelete('cascade');
            $table->string('ancien_statut')->nullable();
            $table->string('nouveau_statut');
            $table->decimal('montant_caution', 8, 2)->default(0);
            $table->decimal('montant_retenu', 8, 2)->default(0);
            $table->text('motif')->nullable();
            $table->foreignId('agent_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('caution_histories');
    }
};
