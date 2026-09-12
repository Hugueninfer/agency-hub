<?php

namespace App\Domain\Services;

use App\Domain\Repositories\NotificationPreferenceRepository;
use App\Domain\Repositories\NotificationRepository;
use App\Models\Notification;
use App\Models\NotificationPreference;
use App\Support\Notifications\NotificationType;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Validation\ValidationException;

class NotificationService
{
    public function __construct(
        private readonly NotificationRepository $notificationRepository,
        private readonly NotificationPreferenceRepository $preferenceRepository,
    ) {}

    public function getUnreadCount(int $tenantId, int $userId): int
    {
        return $this->notificationRepository->unreadCountForUser($tenantId, $userId);
    }

    public function listNotifications(int $tenantId, int $userId, int $perPage = 20, ?string $filter = null): LengthAwarePaginator
    {
        return $this->notificationRepository->listForUser($tenantId, $userId, $perPage, $filter);
    }

    public function markAsRead(string $notificationUuid, int $tenantId, int $userId): ?Notification
    {
        return $this->notificationRepository->markAsRead($notificationUuid, $tenantId, $userId);
    }

    public function markAllAsRead(int $tenantId, int $userId): int
    {
        return $this->notificationRepository->markAllAsRead($tenantId, $userId);
    }

    /**
     * @return Collection<int, NotificationPreference>
     */
    public function getPreferences(int $tenantId, int $userId): Collection
    {
        $prefs = $this->preferenceRepository->getPreferencesForUser($tenantId, $userId);

        // If user has no preferences yet, create defaults
        if ($prefs->isEmpty()) {
            $this->preferenceRepository->setDefaultsForUser($tenantId, $userId);

            return $this->preferenceRepository->getPreferencesForUser($tenantId, $userId);
        }

        return $prefs;
    }

    /**
     * @param  array<int, array{type: string, database_enabled?: bool, email_enabled?: bool}>  $preferences
     */
    public function updatePreferences(int $tenantId, int $userId, array $preferences): void
    {
        $validTypes = NotificationType::all();

        foreach ($preferences as $pref) {
            if (! in_array($pref['type'], $validTypes, true)) {
                throw ValidationException::withMessages([
                    'preferences.*.type' => ["Invalid notification type: {$pref['type']}."],
                ]);
            }

            $this->preferenceRepository->setPreference(
                $tenantId,
                $userId,
                $pref['type'],
                $pref['database_enabled'] ?? true,
                $pref['email_enabled'] ?? true,
            );
        }
    }
}
