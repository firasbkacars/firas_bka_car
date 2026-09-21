<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->integer('nombre_locations')->default(0);
            $table->integer('points_fidelite')->default(0);
            $table->string('niveau_fidelite')->default('bronze');
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn(['nombre_locations', 'points_fidelite', 'niveau_fidelite']);
        });
    }
};
