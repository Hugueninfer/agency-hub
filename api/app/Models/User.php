<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Laravel\Sanctum\HasApiTokens;

#[UseFactory(UserFactory::class)]
#[Hidden(['id', 'password', 'remember_token'])]
class User extends BaseAuthenticatableWithUuid
{
    use HasApiTokens;

    protected $fillable = [
        'uuid',
        'tenant_id',
        'name',
        'email',
        'password',
        'photo_path',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'role_user');
    }

    public function assignedTasks(): BelongsToMany
    {
        return $this->belongsToMany(Task::class, 'task_user', 'user_id', 'task_id')->withTimestamps();
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class, 'notifiable_id');
    }

    /**
     * Per-request cache of the user's permission codes.
     *
     * @var array<int, string>|null
     */
    private ?array $permissionCodesCache = null;

    public function hasPermission(string $permissionCode): bool
    {
        return in_array($permissionCode, $this->permissionCodes(), true);
    }

    /**
     * All permission codes granted to the user (via roles), resolved once per request.
     * Reuses eager-loaded roles.permissions when present to avoid an extra query on
     * every permission-protected route.
     *
     * @return array<int, string>
     */
    public function permissionCodes(): array
    {
        if ($this->permissionCodesCache !== null) {
            return $this->permissionCodesCache;
        }

        if (! $this->relationLoaded('roles')) {
            $this->load('roles.permissions');
        }

        $codes = $this->roles
            ->flatMap(fn ($role) => $role->relationLoaded('permissions')
                ? $role->permissions->pluck('code')
                : $role->permissions()->pluck('code'))
            ->unique()
            ->values()
            ->all();

        return $this->permissionCodesCache = $codes;
    }
}
