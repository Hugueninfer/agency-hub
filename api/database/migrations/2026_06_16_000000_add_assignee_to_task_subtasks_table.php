<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('task_subtasks', function (Blueprint $table) {
            $table->foreignId('assignee_id')
                ->nullable()
                ->after('is_done')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('task_subtasks', function (Blueprint $table) {
            $table->dropForeignIdFor(\App\Models\User::class, 'assignee_id');
            $table->dropColumn('assignee_id');
        });
    }
};
