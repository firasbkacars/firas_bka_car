<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Indices de nouveaute (badges) : horodatages "derniere vue".
 * - users.reservations_vues_le : derniere consultation admin de la liste des
 *   reservations -> badge "nouvelles reservations".
 * - users.clients_vus_le : derniere consultation admin de la liste clients
 *   -> badge "nouveaux clients".
 * - clients.reservations_vues_le : derniere consultation client de ses
 *   reservations -> badge "mes reservations" cote client.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('reservations_vues_le')->nullable();
            $table->timestamp('clients_vus_le')->nullable();
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->timestamp('reservations_vues_le')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['reservations_vues_le', 'clients_vus_le']);
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn('reservations_vues_le');
        });
    }
};
