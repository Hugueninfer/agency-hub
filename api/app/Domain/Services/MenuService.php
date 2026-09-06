<?php

namespace App\Domain\Services;

use App\Domain\Repositories\MenuItemRepository;
use App\Models\MenuItem;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class MenuService
{
    public function __construct(
        private readonly MenuItemRepository $menuItemRepository,
    ) {}

    /**
     * @return Collection<int, MenuItem>
     */
    public function getMenu(int $tenantId, bool $includeInactive = false): Collection
    {
        return $includeInactive
            ? $this->menuItemRepository->listAllForTenant($tenantId)
            : $this->menuItemRepository->listForTenant($tenantId);
    }

    /**
     * @param  array<int, array{label: string, icon?: string, route?: string, url?: string, permission?: string, section: string, order: int, is_active: bool, parent_id?: int|null}>  $items
     */
    public function updateMenu(int $tenantId, array $items): void
    {
        DB::transaction(function () use ($tenantId, $items): void {
            // Get existing item UUIDs
            $existing = $this->menuItemRepository->listAllForTenant($tenantId);
            $existingUuids = $existing->pluck('uuid')->toArray();

            $incomingUuids = [];

            foreach ($items as $item) {
                $uuid = $item['uuid'] ?? null;
                if ($uuid !== null) {
                    $incomingUuids[] = $uuid;
                }

                $data = [
                    'tenant_id' => $tenantId,
                    'section' => $item['section'] ?? 'main',
                    'label' => $item['label'],
                    'icon' => $item['icon'] ?? null,
                    'route' => $item['route'] ?? null,
                    'url' => $item['url'] ?? null,
                    'permission' => $item['permission'] ?? null,
                    'order' => $item['order'] ?? 0,
                    'is_active' => $item['is_active'] ?? true,
                ];

                if ($uuid && in_array($uuid, $existingUuids, true)) {
                    MenuItem::query()
                        ->where('tenant_id', $tenantId)
                        ->where('uuid', $uuid)
                        ->update($data);
                } else {
                    $data['uuid'] = $uuid ?? (string) \Illuminate\Support\Str::uuid();
                    MenuItem::query()->create($data);
                }
            }

            // Remove items that are no longer in the list
            $toDelete = array_diff($existingUuids, $incomingUuids);
            if ($toDelete !== []) {
                MenuItem::query()
                    ->where('tenant_id', $tenantId)
                    ->whereIn('uuid', $toDelete)
                    ->delete();
            }
        });
    }
}
