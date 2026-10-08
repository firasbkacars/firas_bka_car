<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            if (! Schema::hasColumn('reservations', 'code_promo')) {
                $table->string('code_promo')->nullable()->after('notes');
            }
            if (! Schema::hasColumn('reservations', 'remise')) {
                $table->decimal('remise', 8, 2)->default(0)->after('code_promo');
            }
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            if (Schema::hasColumn('reservations', 'remise')) {
                $table->dropColumn('remise');
            }
            if (Schema::hasColumn('reservations', 'code_promo')) {
                $table->dropColumn('code_promo');
            }
        });
    }
};
