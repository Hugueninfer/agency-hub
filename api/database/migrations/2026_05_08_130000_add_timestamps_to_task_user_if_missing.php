<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('task_user') || Schema::hasColumn('task_user', 'created_at')) {
            return;
        }

        Schema::table('task_user', function (Blueprint $table) {
            $table->timestamps();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('task_user') || ! Schema::hasColumn('task_user', 'created_at')) {
            return;
        }

        Schema::table('task_user', function (Blueprint $table) {
            $table->dropTimestamps();
        });
    }
};
