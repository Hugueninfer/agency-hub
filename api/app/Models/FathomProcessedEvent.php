<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FathomProcessedEvent extends BaseModel
{
    protected $fillable = [
        'meeting_id',
        'tenant_id',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
