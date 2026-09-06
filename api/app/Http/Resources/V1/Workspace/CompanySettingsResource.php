<?php

namespace App\Http\Resources\V1\Workspace;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CompanySettingsResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var \App\Models\Tenant $tenant */
        $tenant = $this->resource;

        return [
            'tenant_uuid' => $tenant->uuid,
            'company_name' => $tenant->name,
            'logo_url' => $tenant->logo_path
                ? rtrim($request->getSchemeAndHttpHost(), '/').'/storage/'.$tenant->logo_path
                : null,
            'drive_link' => $tenant->drive_link,
            'drive_link_label' => $tenant->drive_link_label ?? 'Drive',
        ];
    }
}
