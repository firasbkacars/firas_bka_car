<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('codes_promo', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('type'); // pourcentage ou montant_fixe
            $table->decimal('valeur', 8, 2);
            $table->timestamp('date_expiration')->nullable();
            $table->integer('usage_max')->default(1);
            $table->integer('usage_actuel')->default(0);
            $table->boolean('actif')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('codes_promo');
    }
};
