<?php

namespace App\Domain\Services;

use App\Models\Tenant;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class TenantService
{
    public function getSettings(int $tenantId): Tenant
    {
        $tenant = Tenant::query()->find($tenantId);

        if ($tenant === null) {
            throw new NotFoundHttpException('Tenant not found.');
        }

        return $tenant;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateSettings(int $tenantId, array $data): Tenant
    {
        $tenant = Tenant::query()->findOrFail($tenantId);

        $payload = [];

        // Logo upload
        if (isset($data['logo']) && $data['logo'] instanceof UploadedFile) {
            // Delete old logo
            if ($tenant->logo_path) {
                Storage::disk('public')->delete($tenant->logo_path);
            }

            $payload['logo_path'] = $data['logo']->store('tenant-logos', 'public');
        }

        // Logo removal
        if (! empty($data['remove_logo'])) {
            if ($tenant->logo_path) {
                Storage::disk('public')->delete($tenant->logo_path);
            }
            $payload['logo_path'] = null;
        }

        // Drive link fields
        if (array_key_exists('drive_link', $data)) {
            $payload['drive_link'] = $data['drive_link'] ?: null;
        }
        if (array_key_exists('drive_link_label', $data)) {
            $payload['drive_link_label'] = $data['drive_link_label'] ?? 'Drive';
        }

        if ($payload !== []) {
            $tenant->update($payload);
        }

        return $tenant->fresh();
    }
}
