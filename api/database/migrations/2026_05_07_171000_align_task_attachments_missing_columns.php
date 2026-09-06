<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('task_attachments')) {
            return;
        }

        Schema::table('task_attachments', function (Blueprint $table) {
            if (!Schema::hasColumn('task_attachments', 'tenant_id')) {
                $table->foreignId('tenant_id')->nullable()->after('id')->constrained('tenants')->cascadeOnDelete();
            }
            if (!Schema::hasColumn('task_attachments', 'uploaded_by')) {
                $table->foreignId('uploaded_by')->nullable()->after('task_id')->constrained('users')->cascadeOnDelete();
            }
            if (!Schema::hasColumn('task_attachments', 'path')) {
                $table->string('path')->nullable()->after('uploaded_by');
            }
            if (!Schema::hasColumn('task_attachments', 'original_name')) {
                $table->string('original_name')->nullable()->after('path');
            }
            if (!Schema::hasColumn('task_attachments', 'mime')) {
                $table->string('mime', 120)->nullable()->after('original_name');
            }
            if (!Schema::hasColumn('task_attachments', 'size_bytes')) {
                $table->unsignedBigInteger('size_bytes')->default(0)->after('mime');
            }
            if (!Schema::hasColumn('task_attachments', 'uuid')) {
                $table->uuid('uuid')->nullable()->after('id');
            }
        });
    }

    public function down(): void
    {
        // Compat migration: rollback destrutivo desabilitado.
    }
};
