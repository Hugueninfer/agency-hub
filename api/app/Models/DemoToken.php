<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DemoToken extends BaseModel
{
    protected $primaryKey = 'digest';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'digest',
        'tenant_id',
        'user_id',
        'expires_at',
    ];

    protected $hidden = [
        'digest',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
