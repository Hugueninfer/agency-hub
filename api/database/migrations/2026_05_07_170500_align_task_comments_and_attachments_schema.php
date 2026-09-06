<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('task_comments')) {
            Schema::table('task_comments', function (Blueprint $table) {
                if (!Schema::hasColumn('task_comments', 'uuid')) {
                    $table->uuid('uuid')->nullable()->after('id');
                }
                if (!Schema::hasColumn('task_comments', 'user_id')) {
                    $table->foreignId('user_id')->nullable()->after('task_id')->constrained('users')->cascadeOnDelete();
                }
            });
        }

        if (Schema::hasTable('task_attachments')) {
            Schema::table('task_attachments', function (Blueprint $table) {
                if (!Schema::hasColumn('task_attachments', 'uuid')) {
                    $table->uuid('uuid')->nullable()->after('id');
                }
                if (!Schema::hasColumn('task_attachments', 'uploaded_by')) {
                    $table->foreignId('uploaded_by')->nullable()->after('task_id')->constrained('users')->cascadeOnDelete();
                }
                if (!Schema::hasColumn('task_attachments', 'size_bytes')) {
                    $table->unsignedBigInteger('size_bytes')->default(0)->after('mime');
                }
            });
        }
    }

    public function down(): void
    {
        // Migration de compatibilidade: sem rollback destrutivo.
    }
};
