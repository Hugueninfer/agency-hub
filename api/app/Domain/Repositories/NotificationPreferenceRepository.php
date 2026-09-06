<?php

namespace App\Domain\Repositories;

use App\Domain\Traits\Repository\DefaultFilterTrait;
use App\Domain\Traits\Repository\SecurityFilterTrait;
use App\Models\NotificationPreference;
use App\Support\Notifications\NotificationType;
use Illuminate\Database\Eloquent\Collection;

class NotificationPreferenceRepository extends BaseRepository
{
    use DefaultFilterTrait;
    use SecurityFilterTrait;

    public function __construct(NotificationPreference $model)
    {
        parent::__construct($model);
    }

    public function model(): string
    {
        return NotificationPreference::class;
    }

    /**
     * @return Collection<int, NotificationPreference>
     */
    public function getPreferencesForUser(int $tenantId, int $userId): Collection
    {
        /** @var Collection<int, NotificationPreference> */
        return $this->model->newQuery()
            ->where('tenant_id', $tenantId)
            ->where('user_id', $userId)
            ->get();
    }

    public function setPreference(
        int $tenantId,
        int $userId,
        string $type,
        bool $databaseEnabled,
        bool $emailEnabled,
    ): NotificationPreference {
        /** @var NotificationPreference */
        return $this->model->newQuery()->updateOrCreate(
            [
                'tenant_id' => $tenantId,
                'user_id' => $userId,
                'type' => $type,
            ],
            [
                'database_enabled' => $databaseEnabled,
                'email_enabled' => $emailEnabled,
            ],
        );
    }

    /**
     * Set default preferences (both channels enabled) for all notification types.
     */
    public function setDefaultsForUser(int $tenantId, int $userId): void
    {
        foreach (NotificationType::all() as $type) {
            $this->model->newQuery()->firstOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'user_id' => $userId,
                    'type' => $type,
                ],
                [
                    'database_enabled' => true,
                    'email_enabled' => true,
                ],
            );
        }
    }

    /**
     * Get a specific preference for a user and type, or null if not set.
     */
    public function getPreference(int $tenantId, int $userId, string $type): ?NotificationPreference
    {
        /** @var NotificationPreference|null */
        return $this->model->newQuery()
            ->where('tenant_id', $tenantId)
            ->where('user_id', $userId)
            ->where('type', $type)
            ->first();
    }
}
