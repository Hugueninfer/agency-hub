<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FathomIntegration extends BaseModel
{
    protected $fillable = [
        'tenant_id',
        'token',
        'webhook_secret',
        'default_project_uuid',
        'default_board_column',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
