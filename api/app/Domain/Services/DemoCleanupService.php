<?php

namespace App\Domain\Services;

use App\Models\Tenant;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DemoCleanupService
{
    public function __construct(private readonly TenantService $tenants) {}

    /** Null means another cleanup owns the lock; callers never wait for it. */
    public function cleanup(int $limit): ?int
    {
        if ($limit < 1) {
            throw new \InvalidArgumentException('The limit must be a positive integer.');
        }
        $connection = DB::connection();
        $mysql = $connection->getDriverName() === 'mysql';
        $lock = $mysql ? null : Cache::lock('agency-hub-demo-cleanup', 300);
        $acquired = $mysql
            ? (int) $connection->selectOne("SELECT GET_LOCK('agency-hub-demo-cleanup', 0) AS acquired")->acquired === 1
            : $lock->get();
        if (! $acquired) {
            return null;
        }

        try {
            $ids = Tenant::where('kind', 'demo')->where('expires_at', '<=', now())
                ->orderBy('expires_at')->orderBy('id')->limit($limit)->pluck('id');
            $deleted = 0;
            foreach ($ids as $id) {
                $deleted += DB::transaction(function () use ($id): int {
                    $tenant = Tenant::whereKey($id)->where('kind', 'demo')
                        ->where('expires_at', '<=', now())->lockForUpdate()->first();
                    if ($tenant === null) {
                        return 0;
                    }
                    $this->tenants->deleteForLifecycle($tenant);

                    return 1;
                });
            }

            return $deleted;
        } finally {
            if ($mysql) {
                $connection->selectOne("SELECT RELEASE_LOCK('agency-hub-demo-cleanup') AS released");
            } else {
                $lock->release();
            }
        }
    }
}
