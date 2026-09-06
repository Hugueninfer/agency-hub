<?php

namespace App\Domain\Services;

use App\Domain\Exceptions\DemoWriteLimitExceeded;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Facades\DB;

/** Request-scoped accounting; all reservations share the unsafe-request transaction. */
class DemoWriteBudgetService
{
    private ?int $tenantId = null;

    private bool $exceeded = false;

    public function begin(int $tenantId): void
    {
        $this->tenantId = $tenantId;
        $this->exceeded = false;

        // Serialize requests, reset and cleanup for this tenant. This also makes
        // read/count/reserve sequences for bulk and pivot writes consistent.
        $tenant = DB::table('tenants')->where('id', $tenantId)->lockForUpdate()->first();
        if ($tenant === null || $tenant->kind !== 'demo' || now()->greaterThanOrEqualTo($tenant->expires_at)) {
            throw new AuthenticationException;
        }
        if ($tenant->demo_write_count >= (int) config('services.demo.max_writes', 5000)) {
            $this->exceeded = true;
            throw new DemoWriteLimitExceeded;
        }
    }

    public function reserve(int $units = 1): void
    {
        if ($this->tenantId === null || $units === 0) {
            return;
        }
        if ($units < 0) {
            throw new \InvalidArgumentException('Write reservations cannot be negative.');
        }

        // Query builder deliberately avoids recursively firing Eloquent events.
        $updated = DB::table('tenants')
            ->where('id', $this->tenantId)
            ->where('kind', 'demo')
            ->where('demo_write_count', '<=', max(0, (int) config('services.demo.max_writes', 5000)) - $units)
            ->increment('demo_write_count', $units);

        if ($updated !== 1) {
            $this->exceeded = true;
            throw new DemoWriteLimitExceeded;
        }
    }

    /** Sync plain foreign-key IDs, reserving only inserted pivot rows. */
    public function sync(BelongsToMany $relation, array $ids, bool $detaching = true): void
    {
        if ($this->tenantId !== null) {
            $inserted = array_diff(array_unique($ids), $relation->allRelatedIds()->all());
            $this->reserve(count($inserted));
        }
        $relation->sync($ids, $detaching);
    }

    public function assertWithinLimit(): void
    {
        // Existing controllers sometimes catch Throwable and return their own
        // error response. Preserve 429 even when they catch the budget exception.
        if ($this->exceeded) {
            throw new DemoWriteLimitExceeded;
        }
    }

    public function end(): void
    {
        $this->tenantId = null;
        $this->exceeded = false;
    }
}
