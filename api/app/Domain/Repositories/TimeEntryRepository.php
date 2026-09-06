<?php

namespace App\Domain\Repositories;

use App\Models\TimeEntry;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class TimeEntryRepository extends BaseRepository
{
    public function __construct(TimeEntry $model)
    {
        parent::__construct($model);
    }

    public function model(): string
    {
        return TimeEntry::class;
    }

    public function findByUuidForTenant(string $uuid, int $tenantId): ?TimeEntry
    {
        /** @var TimeEntry|null */
        return $this->model->newQuery()
            ->where('tenant_id', $tenantId)
            ->where('uuid', $uuid)
            ->first();
    }

    /**
     * @param  list<int>|null  $userIds
     * @param  list<int>|null  $projectIds
     */
    public function paginateForTenant(
        int $tenantId,
        int $perPage,
        ?array $userIds,
        ?array $projectIds,
        ?string $dateFrom,
        ?string $dateTo,
    ): LengthAwarePaginator {
        $query = $this->model->newQuery()
            ->where('tenant_id', $tenantId)
            ->with([
                'user:id,uuid,name,email,photo_path',
                'task:id,uuid,title,project_id',
                'project:id,uuid,name',
            ])
            ->orderByDesc('worked_date')
            ->orderByDesc('id');

        if ($userIds !== null && $userIds !== []) {
            $query->whereIn('user_id', $userIds);
        }

        if ($projectIds !== null && $projectIds !== []) {
            $query->whereIn('project_id', $projectIds);
        }

        if ($dateFrom !== null && $dateFrom !== '') {
            $query->whereDate('worked_date', '>=', $dateFrom);
        }

        if ($dateTo !== null && $dateTo !== '') {
            $query->whereDate('worked_date', '<=', $dateTo);
        }

        return $query->paginate($perPage);
    }

    /**
     * @param  list<int>|null  $userIds
     * @param  list<int>|null  $projectIds
     * @return Collection<int, TimeEntry>
     */
    public function listAllForExport(
        int $tenantId,
        ?array $userIds,
        ?array $projectIds,
        ?string $dateFrom,
        ?string $dateTo,
    ): Collection {
        $query = $this->model->newQuery()
            ->where('time_entries.tenant_id', $tenantId)
            ->join('users', 'time_entries.user_id', '=', 'users.id')
            ->leftJoin('projects', 'time_entries.project_id', '=', 'projects.id')
            ->leftJoin('tasks', 'time_entries.task_id', '=', 'tasks.id')
            ->select([
                'time_entries.*',
                'users.name as user_name',
                'projects.name as project_name',
                'tasks.title as task_title',
            ])
            ->orderBy('time_entries.worked_date')
            ->orderBy('users.name');

        if ($userIds !== null && $userIds !== []) {
            $query->whereIn('time_entries.user_id', $userIds);
        }

        if ($projectIds !== null && $projectIds !== []) {
            $query->whereIn('time_entries.project_id', $projectIds);
        }

        if ($dateFrom !== null && $dateFrom !== '') {
            $query->whereDate('time_entries.worked_date', '>=', $dateFrom);
        }

        if ($dateTo !== null && $dateTo !== '') {
            $query->whereDate('time_entries.worked_date', '<=', $dateTo);
        }

        /** @var Collection<int, TimeEntry> */
        return $query->get();
    }

    /**
     * @param  list<int>|null  $userIds
     * @param  list<int>|null  $projectIds
     * @return Collection<int, TimeEntry>
     */
    public function listForTenantSummary(
        int $tenantId,
        ?array $userIds,
        ?array $projectIds,
        ?string $dateFrom,
        ?string $dateTo,
    ): Collection {
        $query = $this->model->newQuery()
            ->where('tenant_id', $tenantId);

        if ($userIds !== null && $userIds !== []) {
            $query->whereIn('user_id', $userIds);
        }

        if ($projectIds !== null && $projectIds !== []) {
            $query->whereIn('project_id', $projectIds);
        }

        if ($dateFrom !== null && $dateFrom !== '') {
            $query->whereDate('worked_date', '>=', $dateFrom);
        }

        if ($dateTo !== null && $dateTo !== '') {
            $query->whereDate('worked_date', '<=', $dateTo);
        }

        /** @var Collection<int, TimeEntry> */
        return $query->get(['id', 'tenant_id', 'user_id', 'project_id', 'duration_minutes', 'worked_date']);
    }
}
