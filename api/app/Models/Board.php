<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Board extends BaseModel
{
    protected $fillable = [
        'uuid',
        'tenant_id',
        'name',
        'excalidraw_data',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'excalidraw_data' => 'array',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $board): void {
            if (empty($board->uuid)) {
                $board->uuid = (string) Str::uuid();
            }
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
