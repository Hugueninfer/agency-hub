<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('logo_path')->nullable()->after('status');
            $table->string('accent_color', 7)->default('#DCEB63')->after('logo_path');
            $table->string('secondary_color', 7)->default('#8B5CF6')->after('accent_color');
            $table->string('drive_link')->nullable()->after('secondary_color');
            $table->string('drive_link_label', 50)->default('Drive')->after('drive_link');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn(['logo_path', 'accent_color', 'secondary_color', 'drive_link', 'drive_link_label']);
        });
    }
};
