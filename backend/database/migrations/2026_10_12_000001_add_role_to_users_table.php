<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // A2 : roles staff. Le client a son propre modele (App\Models\Client).
            $table->string('role', 20)->default('employe')->after('password');
            $table->index('role');
        });

        // Les comptes existants sont tous des administrateurs aujourd'hui :
        // on les re-backfill avant que la valeur par defaut ne devienne 'employe'.
        DB::table('users')->update(['role' => 'admin']);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['role']);
            $table->dropColumn('role');
        });
    }
};
