<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Quando a tabela `tasks` já existia sem colunas do Kanban, o código continua a ordenar
     * por `board_column` e `position`. Esta migração torna o esquema compatível.
     */
    public function up(): void
    {
        if (! Schema::hasTable('tasks')) {
            return;
        }

        Schema::table('tasks', function (Blueprint $table) {
            if (! Schema::hasColumn('tasks', 'board_column')) {
                $table->string('board_column', 32)->default('todo');
            }
        });

        Schema::table('tasks', function (Blueprint $table) {
            if (! Schema::hasColumn('tasks', 'position')) {
                $table->unsignedInteger('position')->default(0);
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('tasks')) {
            return;
        }

        Schema::table('tasks', function (Blueprint $table) {
            if (Schema::hasColumn('tasks', 'position')) {
                $table->dropColumn('position');
            }
        });

        Schema::table('tasks', function (Blueprint $table) {
            if (Schema::hasColumn('tasks', 'board_column')) {
                $table->dropColumn('board_column');
            }
        });
    }
};
