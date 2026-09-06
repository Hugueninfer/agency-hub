<?php

namespace App\Console\Commands;

use App\Domain\Services\TenantService;
use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class CleanupExpiredDemos extends Command
{
    protected $signature = 'demo:cleanup {--limit=100 : Maximum expired tenants to delete}';

    protected $description = 'Delete expired demo workspaces and their tenant data';

    public function handle(TenantService $tenants): int
    {
        $limit = filter_var($this->option('limit'), FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($limit === false) {
            $this->error('The limit must be a positive integer.');

            return self::INVALID;
        }

        $connection = DB::connection();
        $mysql = $connection->getDriverName() === 'mysql';
        // SQLite/local environments use a cache lock; MySQL's lock is owned by
        // the database session and is released even when a worker disconnects.
        $lock = $mysql ? null : Cache::lock('agency-hub-demo-cleanup', 300);
        $acquired = $mysql
            ? (int) $connection->selectOne("SELECT GET_LOCK('agency-hub-demo-cleanup', 0) AS acquired")->acquired === 1
            : $lock->get();

        if (! $acquired) {
            $this->info('Cleanup already running; deleted 0 demo workspaces.');

            return self::SUCCESS;
        }

        try {
            $ids = Tenant::where('kind', 'demo')->where('expires_at', '<=', now())
                ->orderBy('expires_at')->orderBy('id')->limit($limit)->pluck('id');
            $deleted = 0;
            foreach ($ids as $id) {
                $deleted += DB::transaction(function () use ($id, $tenants): int {
                    $tenant = Tenant::whereKey($id)->where('kind', 'demo')
                        ->where('expires_at', '<=', now())->lockForUpdate()->first();
                    if ($tenant === null) {
                        return 0;
                    }
                    $tenants->deleteForLifecycle($tenant);

                    return 1;
                });
            }
            $this->info("Deleted {$deleted} expired demo workspaces.");

            return self::SUCCESS;
        } finally {
            if ($mysql) {
                $connection->selectOne("SELECT RELEASE_LOCK('agency-hub-demo-cleanup') AS released");
            } else {
                $lock->release();
            }
        }
    }
}
