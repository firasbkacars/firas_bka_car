<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            // Token hache (sha256) : le lien recu par email reste le seul
            // secret utilisable, une fuite de la base ne permet pas de
            // detourner un compte en attente d'activation.
            $table->string('invitation_token', 64)->nullable()->unique()->after('email_verification_token');
            $table->timestamp('invitation_expire_le')->nullable()->after('invitation_token');
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropUnique(['invitation_token']);
            $table->dropColumn(['invitation_token', 'invitation_expire_le']);
        });
    }
};
