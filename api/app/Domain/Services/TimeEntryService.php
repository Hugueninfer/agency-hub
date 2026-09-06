<?php

namespace App\Domain\Services;

use App\Domain\Repositories\TaskRepository;
use App\Domain\Repositories\TimeEntryRepository;
use App\Domain\Repositories\TimeSessionRepository;
use App\Domain\Repositories\UserRepository;
use App\Models\Project;
use App\Models\Task;
use App\Models\TimeEntry;
use App\Models\TimeSession;
use App\Models\User;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Common\Entity\Style\CellAlignment;
use OpenSpout\Common\Entity\Style\Color;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Writer\XLSX\Writer;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TimeEntryService
{
    public function __construct(
        private readonly TaskRepository $taskRepository,
        private readonly TimeEntryRepository $timeEntryRepository,
        private readonly TimeSessionRepository $timeSessionRepository,
        private readonly UserRepository $userRepository,
    ) {}

    private function assertAssignee(Task $task, int $userId): void
    {
        $exists = $task->assignees()->where('users.id', $userId)->exists();
        if (! $exists) {
            throw ValidationException::withMessages([
                'task_uuid' => ['You must be assigned to this task to log time.'],
            ]);
        }
    }

    /**
     * @return Collection<int, Task>
     */
    public function listAssignableTasks(int $tenantId, int $userId, ?string $projectUuid): Collection
    {
        $projectId = null;
        if ($projectUuid !== null && $projectUuid !== '') {
            $project = Project::query()
                ->where('tenant_id', $tenantId)
                ->where('uuid', $projectUuid)
                ->first();
            if ($project === null) {
                throw ValidationException::withMessages([
                    'project_uuid' => ['Project not found.'],
                ]);
            }
            $projectId = $project->id;
        }

        return $this->taskRepository->listAssignableForUser($tenantId, $userId, $projectId);
    }

    public function startTimer(int $tenantId, int $userId, string $taskUuid): TimeSession
    {
        $existing = $this->timeSessionRepository->findActiveForUser($tenantId, $userId);
        if ($existing !== null) {
            throw ValidationException::withMessages([
                'session' => ['Stop the active timer before starting a new one.'],
            ]);
        }

        $task = $this->taskRepository->findByUuidForTenant($taskUuid, $tenantId);
        if ($task === null) {
            throw ValidationException::withMessages([
                'task_uuid' => ['Task not found.'],
            ]);
        }

        $this->assertAssignee($task, $userId);

        /** @var TimeSession */
        return $this->timeSessionRepository->create([
            'tenant_id' => $tenantId,
            'user_id' => $userId,
            'task_id' => $task->id,
            'started_at' => now(),
        ]);
    }

    public function stopTimer(int $tenantId, int $userId): TimeEntry
    {
        return DB::transaction(function () use ($tenantId, $userId): TimeEntry {
            $session = $this->timeSessionRepository->findActiveForUser($tenantId, $userId);
            if ($session === null) {
                throw ValidationException::withMessages([
                    'session' => ['No active timer.'],
                ]);
            }

            $endedAt = now();
            $startedAt = $session->started_at;
            $rawMinutes = (int) floor($startedAt->diffInMinutes($endedAt));
            $durationMinutes = max(1, $rawMinutes);

            $task = Task::query()->findOrFail($session->task_id);
            $workedDate = Carbon::parse($endedAt)->timezone((string) config('app.timezone'))->toDateString();

            /** @var TimeEntry */
            $entry = $this->timeEntryRepository->create([
                'tenant_id' => $tenantId,
                'user_id' => $userId,
                'task_id' => $task->id,
                'project_id' => $task->project_id,
                'source' => TimeEntry::SOURCE_TIMER,
                'started_at' => $startedAt,
                'ended_at' => $endedAt,
                'duration_minutes' => $durationMinutes,
                'worked_date' => $workedDate,
            ]);

            $session->delete();

            return $entry->fresh([
                'user:id,uuid,name,email,photo_path',
                'task:id,uuid,title',
                'project:id,uuid,name',
            ]);
        });
    }

    public function getActiveSession(int $tenantId, int $userId): ?TimeSession
    {
        return $this->timeSessionRepository->findActiveForUser($tenantId, $userId);
    }

    /**
     * @param  list<string>|null  $userUuids
     * @param  list<string>|null  $projectUuids
     */
    public function listEntries(
        int $tenantId,
        int $perPage,
        ?array $userUuids,
        ?array $projectUuids,
        ?string $dateFrom,
        ?string $dateTo,
    ): LengthAwarePaginator {
        $userIds = $this->resolveUserIdsFromUuids($tenantId, $userUuids);
        $projectIds = $this->resolveProjectIdsFromUuids($tenantId, $projectUuids);

        return $this->timeEntryRepository->paginateForTenant(
            $tenantId,
            $perPage,
            $userIds,
            $projectIds,
            $dateFrom,
            $dateTo,
        );
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function createManualEntry(array $data, int $tenantId, int $userId): TimeEntry
    {
        $taskUuid = (string) ($data['task_uuid'] ?? '');
        $task = $this->taskRepository->findByUuidForTenant($taskUuid, $tenantId);
        if ($task === null) {
            throw ValidationException::withMessages([
                'task_uuid' => ['Task not found.'],
            ]);
        }

        $this->assertAssignee($task, $userId);

        $minutes = $this->resolveDurationMinutes($data);

        /** @var TimeEntry */
        return $this->timeEntryRepository->create([
            'tenant_id' => $tenantId,
            'user_id' => $userId,
            'task_id' => $task->id,
            'project_id' => $task->project_id,
            'source' => TimeEntry::SOURCE_MANUAL,
            'started_at' => null,
            'ended_at' => null,
            'duration_minutes' => $minutes,
            'worked_date' => (string) $data['worked_date'],
        ])->fresh([
            'user:id,uuid,name,email,photo_path',
            'task:id,uuid,title',
            'project:id,uuid,name',
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateOwnEntry(string $entryUuid, array $data, int $tenantId, int $userId): TimeEntry
    {
        $entry = $this->timeEntryRepository->findByUuidForTenant($entryUuid, $tenantId);
        if ($entry === null) {
            throw ValidationException::withMessages([
                'uuid' => ['Time entry not found.'],
            ]);
        }

        if ((int) $entry->user_id !== $userId) {
            throw ValidationException::withMessages([
                'uuid' => ['You can only edit your own time entries.'],
            ]);
        }

        $payload = [];

        if (array_key_exists('task_uuid', $data) && $data['task_uuid'] !== null && $data['task_uuid'] !== '') {
            $task = $this->taskRepository->findByUuidForTenant((string) $data['task_uuid'], $tenantId);
            if ($task === null) {
                throw ValidationException::withMessages([
                    'task_uuid' => ['Task not found.'],
                ]);
            }
            $this->assertAssignee($task, $userId);
            $payload['task_id'] = $task->id;
            $payload['project_id'] = $task->project_id;
        }

        if (array_key_exists('worked_date', $data) && $data['worked_date'] !== null && $data['worked_date'] !== '') {
            $payload['worked_date'] = (string) $data['worked_date'];
        }

        if ($this->durationFieldsPresent($data)) {
            $payload['duration_minutes'] = $this->resolveDurationMinutes($data);
        }

        $relations = [
            'user:id,uuid,name,email,photo_path',
            'task:id,uuid,title',
            'project:id,uuid,name',
        ];

        if ($payload === []) {
            return $entry->fresh($relations);
        }

        /** @var TimeEntry */
        $updated = $this->timeEntryRepository->update($payload, $entry->id);

        return $updated->fresh($relations);
    }

    public function deleteOwnEntry(string $entryUuid, int $tenantId, int $userId): void
    {
        $entry = $this->timeEntryRepository->findByUuidForTenant($entryUuid, $tenantId);
        if ($entry === null) {
            throw ValidationException::withMessages([
                'uuid' => ['Time entry not found.'],
            ]);
        }

        if ((int) $entry->user_id !== $userId) {
            throw ValidationException::withMessages([
                'uuid' => ['You can only delete your own time entries.'],
            ]);
        }

        $this->timeEntryRepository->delete($entry->id);
    }

    /**
     * Fetch all entries for PDF export (no pagination).
     *
     * @param  list<string>|null  $userUuids
     * @param  list<string>|null  $projectUuids
     */
    public function listAllForExport(
        int $tenantId,
        ?array $userUuids,
        ?array $projectUuids,
        ?string $dateFrom,
        ?string $dateTo,
    ): Collection {
        $userIds = $this->resolveUserIdsFromUuids($tenantId, $userUuids);
        $projectIds = $this->resolveProjectIdsFromUuids($tenantId, $projectUuids);

        return $this->timeEntryRepository->listAllForExport(
            $tenantId,
            $userIds,
            $projectIds,
            $dateFrom,
            $dateTo,
        );
    }

    /**
     * Generate an XLSX spreadsheet export of the time report.
     *
     * @param  list<string>|null  $userUuids
     * @param  list<string>|null  $projectUuids
     */
    public function exportXlsx(
        int $tenantId,
        ?array $userUuids,
        ?array $projectUuids,
        ?string $dateFrom,
        ?string $dateTo,
    ): string {
        $entries = $this->listAllForExport($tenantId, $userUuids, $projectUuids, $dateFrom, $dateTo);
        $summary = $this->reportSummary($tenantId, $userUuids, $projectUuids, $dateFrom, $dateTo);

        $tempPath = tempnam(sys_get_temp_dir(), 'time_report_') . '.xlsx';

        $writer = new Writer();
        $writer->openToFile($tempPath);

        // Styles
        $headerStyle = new Style(
            fontBold: true,
            fontSize: 11,
            fontColor: Color::WHITE,
            backgroundColor: 'FF65A30D',
            cellAlignment: CellAlignment::LEFT,
        );

        $titleStyle = new Style(
            fontBold: true,
            fontSize: 14,
            fontColor: 'FF1A1A2E',
        );

        $sectionStyle = new Style(
            fontBold: true,
            fontSize: 11,
            fontColor: 'FF1A1A2E',
            backgroundColor: 'FFF0FDF4',
        );

        $totalStyle = new Style(
            fontBold: true,
            fontSize: 11,
            fontColor: 'FF65A30D',
        );

        // ── Title row ──
        $writer->addRow(Row::fromValuesWithStyle(['Time Report'], $titleStyle));
        $writer->addRow(Row::fromValues([$this->buildDateRangeLabel($dateFrom, $dateTo)]));
        $writer->addRow(Row::fromValues([])); // spacer

        // ── Summary ──
        $grandTotalMinutes = (int) $summary['grand_total_minutes'];
        $grandHours = floor($grandTotalMinutes / 60);
        $grandMinutes = $grandTotalMinutes % 60;

        $writer->addRow(Row::fromValuesWithStyle(['Summary'], $sectionStyle));
        $writer->addRow(Row::fromValuesWithStyle(
            ['Total Hours', 'Entries', 'Projects', 'People'],
            $headerStyle,
        ));
        $writer->addRow(Row::fromValues([
            "{$grandHours}h {$grandMinutes}m",
            $entries->count(),
            count($summary['by_project']),
            count($summary['by_user']),
        ]));

        $writer->addRow(Row::fromValues([])); // spacer

        // ── By Project ──
        $writer->addRow(Row::fromValuesWithStyle(['Hours by Project'], $sectionStyle));
        $writer->addRow(Row::fromValuesWithStyle(['Project', 'Hours', 'Minutes'], $headerStyle));

        $byProjectTotal = ['hours' => 0, 'minutes' => 0];
        foreach ($summary['by_project'] as $row) {
            $h = floor((int) $row['duration_minutes'] / 60);
            $m = (int) $row['duration_minutes'] % 60;
            $byProjectTotal['hours'] += $h;
            $byProjectTotal['minutes'] += $m;
            $writer->addRow(Row::fromValues([$row['project_name'], $h, $m]));
        }
        // Subtotal project row
        $byProjectTotal['hours'] += floor($byProjectTotal['minutes'] / 60);
        $byProjectTotal['minutes'] = $byProjectTotal['minutes'] % 60;
        $writer->addRow(Row::fromValuesWithStyle(
            ['Subtotal', $byProjectTotal['hours'], $byProjectTotal['minutes']],
            $totalStyle,
        ));

        $writer->addRow(Row::fromValues([])); // spacer

        // ── By Person ──
        $writer->addRow(Row::fromValuesWithStyle(['Hours by Person'], $sectionStyle));
        $writer->addRow(Row::fromValuesWithStyle(['Person', 'Hours', 'Minutes'], $headerStyle));

        $byUserTotal = ['hours' => 0, 'minutes' => 0];
        foreach ($summary['by_user'] as $row) {
            $h = floor((int) $row['duration_minutes'] / 60);
            $m = (int) $row['duration_minutes'] % 60;
            $byUserTotal['hours'] += $h;
            $byUserTotal['minutes'] += $m;
            $writer->addRow(Row::fromValues([$row['user_name'], $h, $m]));
        }
        $byUserTotal['hours'] += floor($byUserTotal['minutes'] / 60);
        $byUserTotal['minutes'] = $byUserTotal['minutes'] % 60;
        $writer->addRow(Row::fromValuesWithStyle(
            ['Subtotal', $byUserTotal['hours'], $byUserTotal['minutes']],
            $totalStyle,
        ));

        $writer->addRow(Row::fromValues([])); // spacer

        // ── Detailed entries ──
        $writer->addRow(Row::fromValuesWithStyle(['Detailed Entries'], $sectionStyle));
        $writer->addRow(Row::fromValuesWithStyle(
            ['Date', 'Person', 'Project', 'Task', 'Hours', 'Minutes', 'Source'],
            $headerStyle,
        ));

        $sourceStyleTimer = new Style(fontColor: 'FF1D4ED8');
        $sourceStyleManual = new Style(fontColor: 'FFB45309');

        foreach ($entries as $entry) {
            $h = floor((int) $entry->duration_minutes / 60);
            $m = (int) $entry->duration_minutes % 60;

            $writer->addRow(Row::fromValues([
                $entry->worked_date?->toDateString(),
                $entry->user?->name ?? '—',
                $entry->project?->name ?? '—',
                $entry->task?->title ?? '—',
                $h,
                $m,
                $entry->source === 'timer' ? 'Timer' : 'Manual',
            ]));
        }

        $writer->addRow(Row::fromValues([])); // spacer
        $writer->addRow(Row::fromValuesWithStyle(
            ['Grand Total', '', '', '', $grandHours, $grandMinutes, ''],
            $totalStyle,
        ));

        $writer->close();

        return $tempPath;
    }

    private function buildDateRangeLabel(?string $dateFrom, ?string $dateTo): string
    {
        if ($dateFrom && $dateTo) {
            return "$dateFrom — $dateTo";
        }
        if ($dateFrom) {
            return "From $dateFrom";
        }
        if ($dateTo) {
            return "Until $dateTo";
        }
        return 'All time';
    }

    /**
     * @param  list<string>|null  $userUuids
     * @param  list<string>|null  $projectUuids
     * @return array<string, mixed>
     */
    public function reportSummary(
        int $tenantId,
        ?array $userUuids,
        ?array $projectUuids,
        ?string $dateFrom,
        ?string $dateTo,
    ): array {
        $userIds = $this->resolveUserIdsFromUuids($tenantId, $userUuids);
        $projectIds = $this->resolveProjectIdsFromUuids($tenantId, $projectUuids);

        $entries = $this->timeEntryRepository->listForTenantSummary(
            $tenantId,
            $userIds,
            $projectIds,
            $dateFrom,
            $dateTo,
        );

        $grandTotal = (int) $entries->sum('duration_minutes');

        $byProject = [];
        foreach ($entries->groupBy('project_id') as $projectId => $group) {
            /** @var int|string|null $projectId */
            $project = $projectId !== null ? Project::query()->find((int) $projectId) : null;
            $byProject[] = [
                'project_uuid' => $project?->uuid,
                'project_name' => $project?->name ?? '—',
                'duration_minutes' => (int) $group->sum('duration_minutes'),
            ];
        }

        $byUser = [];
        foreach ($entries->groupBy('user_id') as $uid => $group) {
            $user = User::query()->find((int) $uid);
            $byUser[] = [
                'user_uuid' => $user?->uuid,
                'user_name' => $user?->name ?? '—',
                'duration_minutes' => (int) $group->sum('duration_minutes'),
            ];
        }

        $byProjectAndUser = [];
        foreach ($entries->groupBy(fn ($e) => ($e->project_id ?? 'null').'_'.$e->user_id) as $group) {
            $first = $group->first();
            $project = $first->project_id !== null ? Project::query()->find((int) $first->project_id) : null;
            $user = User::query()->find((int) $first->user_id);
            $byProjectAndUser[] = [
                'project_uuid' => $project?->uuid,
                'project_name' => $project?->name ?? '—',
                'user_uuid' => $user?->uuid,
                'user_name' => $user?->name ?? '—',
                'duration_minutes' => (int) $group->sum('duration_minutes'),
            ];
        }

        return [
            'grand_total_minutes' => $grandTotal,
            'by_project' => $byProject,
            'by_user' => $byUser,
            'by_project_and_user' => $byProjectAndUser,
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function resolveDurationMinutes(array $data): int
    {
        if (isset($data['duration_minutes']) && $data['duration_minutes'] !== null && $data['duration_minutes'] !== '') {
            return max(1, (int) $data['duration_minutes']);
        }

        $hours = isset($data['hours']) ? (int) $data['hours'] : 0;
        $minutes = isset($data['minutes']) ? (int) $data['minutes'] : 0;
        $total = $hours * 60 + $minutes;

        return max(1, $total);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function durationFieldsPresent(array $data): bool
    {
        return (array_key_exists('duration_minutes', $data) && $data['duration_minutes'] !== null && $data['duration_minutes'] !== '')
            || array_key_exists('hours', $data)
            || array_key_exists('minutes', $data);
    }

    /**
     * @param  list<string>|null  $uuids
     * @return list<int>|null
     */
    private function resolveUserIdsFromUuids(int $tenantId, ?array $uuids): ?array
    {
        if ($uuids === null || $uuids === []) {
            return null;
        }

        return $this->userRepository->idsForUuidsInTenant($uuids, $tenantId);
    }

    /**
     * @param  list<string>|null  $uuids
     * @return list<int>|null
     */
    private function resolveProjectIdsFromUuids(int $tenantId, ?array $uuids): ?array
    {
        if ($uuids === null || $uuids === []) {
            return null;
        }

        return Project::query()
            ->where('tenant_id', $tenantId)
            ->whereIn('uuid', $uuids)
            ->pluck('id')
            ->all();
    }
}
