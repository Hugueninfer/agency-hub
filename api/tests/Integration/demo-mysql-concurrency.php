<?php

// Run only against a freshly migrated disposable agency_hub_test MySQL database:
// APP_ENV=testing DB_CONNECTION=mysql DB_DATABASE=agency_hub_test php tests/Integration/demo-mysql-concurrency.php
use App\Domain\Exceptions\DemoCapacityExceeded;
use App\Domain\Services\DemoSessionService;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

require dirname(__DIR__, 2).'/vendor/autoload.php';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (! $app->environment('testing') || DB::getDriverName() !== 'mysql' || DB::connection()->getDatabaseName() !== 'agency_hub_test') {
    throw new RuntimeException('This probe requires the disposable agency_hub_test MySQL database in testing mode.');
}
config(['app.mode' => 'combined', 'services.demo.max_active' => 3, 'hashing.bcrypt.rounds' => 4]);

function check(bool $condition, string $message): void
{
    if (! $condition) {
        throw new RuntimeException($message);
    }
}

function startWorker(string $mode): array
{
    $process = proc_open([PHP_BINARY, __FILE__, $mode], [['pipe', 'r'], ['pipe', 'w'], ['pipe', 'w']], $pipes);
    check(is_resource($process), 'Could not start worker.');
    stream_set_timeout($pipes[1], 30);

    return [$process, $pipes];
}

function ready(array $worker): void
{
    check(trim((string) fgets($worker[1][1])) === 'READY', 'Worker did not become ready.');
}

function finishWorker(array $worker): string
{
    [$process, $pipes] = $worker;
    fclose($pipes[0]);
    $output = stream_get_contents($pipes[1]);
    $errors = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    check(proc_close($process) === 0, 'Worker failed: '.$errors.' '.$output);

    return trim($output);
}

function parallelWorkers(string $mode, int $count): array
{
    $workers = [];
    for ($index = 0; $index < $count; $index++) {
        $workers[] = startWorker($mode);
    }
    foreach ($workers as $worker) {
        ready($worker);
    }
    foreach ($workers as $worker) {
        fwrite($worker[1][0], "GO\n");
    }

    return array_map('finishWorker', $workers);
}

function tenantRows(array $tenantIds): array
{
    $snapshot = [];
    foreach (Schema::getTableListing() as $table) {
        if ($table === 'tenants' || Schema::hasColumn($table, 'tenant_id')) {
            $snapshot[$table] = DB::table($table)->whereIn($table === 'tenants' ? 'id' : 'tenant_id', $tenantIds)
                ->get()->map(fn ($row) => (array) $row)->sortBy(fn ($row) => json_encode($row, JSON_THROW_ON_ERROR))->values()->all();
        }
    }

    return $snapshot;
}

$mode = $argv[1] ?? 'parent';
if ($mode === 'hold-lock') {
    check((int) DB::selectOne("SELECT GET_LOCK('agency-hub-demo-cleanup', 0) AS acquired")->acquired === 1, 'Could not acquire cleanup lock.');
    echo "READY\n";
    fgets(STDIN);
    DB::selectOne("SELECT RELEASE_LOCK('agency-hub-demo-cleanup')");
    exit(0);
}
if ($mode !== 'parent') {
    echo "READY\n";
    fgets(STDIN);
    if ($mode === 'create') {
        try {
            app(DemoSessionService::class)->create();
            echo 'created';
        } catch (DemoCapacityExceeded) {
            echo 'capacity';
        }
    } elseif ($mode === 'cleanup') {
        $code = Artisan::call('demo:cleanup');
        check($code === 0, 'Cleanup failed.');
        echo Artisan::output();
    } else {
        throw new RuntimeException('Unknown worker mode.');
    }
    exit(0);
}

check(Tenant::where('kind', 'demo')->count() === 0, 'Fresh database required.');
$results = parallelWorkers('create', 8);
check(count(array_filter($results, fn ($result) => $result === 'created')) === 3, 'Capacity must allow exactly three of eight simultaneous creates.');
check(count(array_filter($results, fn ($result) => $result === 'capacity')) === 5, 'Five creates must be refused.');
foreach (['tenants' => 3, 'users' => 9, 'projects' => 9, 'tasks' => 24, 'demo_tokens' => 3] as $table => $count) {
    $query = DB::table($table);
    if ($table === 'tenants') {
        $query->where('kind', 'demo');
    }
    check($query->count() === $count, 'Partial fixture or exceeded capacity in '.$table);
}
echo "PASS capacity: 8 processes, 3 created, 5 refused; complete fixtures only.\n";

$expired = Tenant::where('kind', 'demo')->firstOrFail();
$expired->update(['expires_at' => now()->subMinute()]);
$results = parallelWorkers('create', 4);
check(count(array_filter($results, fn ($result) => $result === 'created')) === 1, 'Only one expired slot may be reused.');
check(count(array_filter($results, fn ($result) => $result === 'capacity')) === 3, 'Three creates must be refused after slot reuse.');
check(Tenant::where('kind', 'demo')->where('expires_at', '>', now())->count() === 3, 'Active capacity exceeded.');
check(! Tenant::whereKey($expired->id)->exists(), 'Creation must opportunistically delete the expired tenant.');
echo "PASS expired capacity: 4 processes, 1 created, 3 refused, expired tenant cleaned.\n";

$active = Tenant::where('kind', 'demo')->where('expires_at', '>', now())->firstOrFail();
Tenant::where('kind', 'demo')->whereKeyNot($active->id)->update(['expires_at' => now()->subMinute()]);
$expiredIds = Tenant::where('kind', 'demo')->where('expires_at', '<=', now())->pluck('id')->all();
$taskIds = DB::table('tasks')->whereIn('tenant_id', $expiredIds)->pluck('id')->all();
$invoiceIds = DB::table('invoices')->whereIn('tenant_id', $expiredIds)->pluck('id')->all();
$userIds = DB::table('users')->whereIn('tenant_id', $expiredIds)->pluck('id')->all();
$roleIds = DB::table('roles')->whereIn('tenant_id', $expiredIds)->pluck('id')->all();
$personal = Tenant::create(['name' => 'Concurrency Personal', 'email' => 'personal@example.test', 'kind' => 'personal']);
User::create(['tenant_id' => $personal->id, 'name' => 'Personal Owner', 'email' => 'owner@example.test', 'password' => 'disposable test password']);
$preservedIds = Tenant::whereNotIn('id', $expiredIds)->pluck('id')->all();
$preserved = tenantRows($preservedIds);
$before = tenantRows($expiredIds);
$holder = startWorker('hold-lock');
ready($holder);
try {
    $results = parallelWorkers('cleanup', 2);
    foreach ($results as $result) {
        check(str_contains($result, 'Cleanup already running; deleted 0'), 'Contending cleanup must do no work.');
    }
    check(tenantRows($expiredIds) === $before, 'Lock loser modified an expired tenant.');
} finally {
    fwrite($holder[1][0], "RELEASE\n");
    finishWorker($holder);
}
echo "PASS cleanup exclusion: independent lock owner blocked both cleanup processes without writes.\n";

$results = parallelWorkers('cleanup', 2);
$deleted = 0;
foreach ($results as $result) {
    if (preg_match('/Deleted (\d+) expired demo workspaces/', $result, $match)) {
        $deleted += (int) $match[1];
    } else {
        check(str_contains($result, 'Cleanup already running; deleted 0'), 'Unexpected cleanup output: '.$result);
    }
}
check($deleted === 2, 'Concurrent cleanup must delete exactly two remaining expired tenants.');
foreach (tenantRows($expiredIds) as $table => $rows) {
    check($rows === [], 'Expired tenant rows remain in '.$table);
}
foreach (['task_comments' => ['task_id', $taskIds], 'task_subtasks' => ['task_id', $taskIds], 'task_attachments' => ['task_id', $taskIds], 'task_user' => ['task_id', $taskIds], 'invoice_items' => ['invoice_id', $invoiceIds], 'role_user' => ['user_id', $userIds], 'permission_role' => ['role_id', $roleIds]] as $table => [$column, $ids]) {
    check(DB::table($table)->whereIn($column, $ids)->count() === 0, 'Orphaned child rows in '.$table);
}
check(tenantRows($preservedIds) === $preserved, 'Active demo or personal tenants changed.');
check(Artisan::call('demo:cleanup') === 0 && str_contains(Artisan::output(), 'Deleted 0'), 'Cleanup is not idempotent.');
echo "PASS concurrent cleanup: 2 processes deleted 2 tenants exactly once; graph removed, active/personal preserved; repeat deleted 0.\n";
