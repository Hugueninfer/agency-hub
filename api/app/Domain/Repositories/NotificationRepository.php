<?php

namespace App\Domain\Repositories;

use App\Domain\Traits\Repository\DefaultFilterTrait;
use App\Domain\Traits\Repository\SecurityFilterTrait;
use App\Models\Notification;
use Illuminate\Pagination\LengthAwarePaginator;

class NotificationRepository extends BaseRepository
{
    use DefaultFilterTrait;
    use SecurityFilterTrait;

    public function __construct(Notification $model)
    {
        parent::__construct($model);
    }

    public function model(): string
    {
        return Notification::class;
    }

    public function listForUser(int $tenantId, int $userId, int $perPage = 20, ?string $filter = null): LengthAwarePaginator
    {
        /** @var LengthAwarePaginator */
        return $this->model->newQuery()
            ->where('tenant_id', $tenantId)
            ->where('notifiable_id', $userId)
            ->when($filter === 'unread', fn ($q) => $q->whereNull('read_at'))
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    public function unreadCountForUser(int $tenantId, int $userId): int
    {
        /** @var int */
        return $this->model->newQuery()
            ->where('tenant_id', $tenantId)
            ->where('notifiable_id', $userId)
            ->whereNull('read_at')
            ->count();
    }

    public function findRecentUnreadForUser(int $tenantId, int $userId, int $limit = 5): iterable
    {
        return $this->model->newQuery()
            ->where('tenant_id', $tenantId)
            ->where('notifiable_id', $userId)
            ->whereNull('read_at')
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();
    }

    public function markAsRead(string $uuid, int $tenantId, int $userId): ?Notification
    {
        /** @var Notification|null */
        $notification = $this->model->newQuery()
            ->where('tenant_id', $tenantId)
            ->where('notifiable_id', $userId)
            ->where('uuid', $uuid)
            ->first();

        if ($notification !== null) {
            $notification->markAsRead();
        }

        return $notification;
    }

    public function markAllAsRead(int $tenantId, int $userId): int
    {
        /** @var int */
        return $this->model->newQuery()
            ->where('tenant_id', $tenantId)
            ->where('notifiable_id', $userId)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
    }
}
