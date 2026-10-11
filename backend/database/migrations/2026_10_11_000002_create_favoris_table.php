<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('favoris', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->foreignId('vehicule_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['client_id', 'vehicule_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('favoris');
    }
};
