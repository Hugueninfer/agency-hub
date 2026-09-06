<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('kind', 16)->default('personal')->index();
            $table->timestamp('expires_at')->nullable()->index();
            $table->unsignedBigInteger('demo_write_count')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropIndex(['kind']);
            $table->dropIndex(['expires_at']);
            $table->dropColumn(['kind', 'expires_at', 'demo_write_count']);
        });
    }
};
