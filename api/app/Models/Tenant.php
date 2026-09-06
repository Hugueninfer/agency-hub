<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Tenant extends BaseModel
{
    protected $fillable = [
        'uuid',
        'name',
        'email',
        'status',
        'logo_path',
        'drive_link',
        'drive_link_label',
        'kind',
        'expires_at',
        'demo_write_count',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'demo_write_count' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $tenant): void {
            if (empty($tenant->uuid)) {
                $tenant->uuid = (string) Str::uuid();
            }
        });
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }

    public function demoTokens(): HasMany
    {
        return $this->hasMany(DemoToken::class);
    }

    public function isDemo(): bool
    {
        return $this->kind === 'demo';
    }
}
