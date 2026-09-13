<?php

namespace App\Console\Commands;

use App\Domain\Services\DemoCleanupService;
use Illuminate\Console\Command;

class CleanupExpiredDemos extends Command
{
    protected $signature = 'demo:cleanup {--limit=100 : Maximum expired tenants to delete}';

    protected $description = 'Delete expired demo workspaces and their tenant data';

    public function handle(DemoCleanupService $cleanup): int
    {
        $limit = filter_var($this->option('limit'), FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($limit === false) {
            $this->error('The limit must be a positive integer.');

            return self::INVALID;
        }

        $deleted = $cleanup->cleanup($limit);
        $this->info($deleted === null
            ? 'Cleanup already running; deleted 0 demo workspaces.'
            : "Deleted {$deleted} expired demo workspaces.");

        return self::SUCCESS;
    }
}
