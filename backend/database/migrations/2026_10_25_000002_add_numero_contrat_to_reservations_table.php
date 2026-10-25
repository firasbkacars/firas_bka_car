<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Chaque reservation possede un contrat imprimable identifie par un
     * numero stable. Le numero est conserve en base pour qu'un contrat
     * imprime reste tracable meme si la reservation est modifiee ensuite.
     */
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->string('numero_contrat')->nullable()->after('numero');
        });

        // Backfill des reservations existantes : le contrat reprend le
        // numero de reservation, prefixe pour etre identifiable.
        DB::table('reservations')
            ->select('id', 'numero')
            ->orderBy('id')
            ->chunkById(200, function ($reservations) {
                foreach ($reservations as $reservation) {
                    DB::table('reservations')
                        ->where('id', $reservation->id)
                        ->update(['numero_contrat' => 'CTR-'.$reservation->numero]);
                }
            });

        Schema::table('reservations', function (Blueprint $table) {
            $table->unique('numero_contrat');
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropUnique(['numero_contrat']);
            $table->dropColumn('numero_contrat');
        });
    }
};
