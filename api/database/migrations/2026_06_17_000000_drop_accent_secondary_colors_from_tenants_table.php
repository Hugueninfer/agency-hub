<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn(['accent_color', 'secondary_color']);
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('accent_color', 7)->default('#DCEB63')->after('logo_path');
            $table->string('secondary_color', 7)->default('#8B5CF6')->after('accent_color');
        });
    }
};
