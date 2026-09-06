<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->uuid('uuid')->nullable()->after('id');
            $table->foreignId('tenant_id')->nullable()->after('uuid')->constrained('tenants');

            $table->index('tenant_id');
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('UPDATE users SET uuid = UUID() WHERE uuid IS NULL');
        } else {
            $users = DB::table('users')->select('id')->get();

            foreach ($users as $user) {
                DB::table('users')->where('id', $user->id)->update([
                    'uuid' => (string) Str::uuid(),
                ]);
            }
        }

        Schema::table('users', function (Blueprint $table) {
            $table->unique('uuid');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('tenant_id');
            $table->dropUnique(['uuid']);
            $table->dropColumn('uuid');
        });
    }
};
