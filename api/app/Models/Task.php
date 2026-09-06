<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Task extends BaseModel
{
    public const SOURCE_MANUAL = 'manual';

    public const SOURCE_FATHOM = 'fathom';

    protected $fillable = [
        'uuid',
        'tenant_id',
        'project_id',
        'title',
        'description',
        'board_column',
        'position',
        'due_date',
        'created_by',
        'source',
        'source_metadata',
    ];

    protected $casts = [
        'source_metadata' => 'array',
    ];

    public const BOARD_TODO = 'todo';

    public const BOARD_IN_PROGRESS = 'in_progress';

    public const BOARD_PENDENCY = 'pendency';

    public const BOARD_DONE = 'done';

    /** @return list<string> */
    public static function boardColumns(): array
    {
        return [
            self::BOARD_TODO,
            self::BOARD_IN_PROGRESS,
            self::BOARD_PENDENCY,
            self::BOARD_DONE,
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (self $task): void {
            if (empty($task->uuid)) {
                $task->uuid = (string) Str::uuid();
            }
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function assignees(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'task_user', 'task_id', 'user_id')->withTimestamps();
    }

    public function subtasks(): HasMany
    {
        return $this->hasMany(TaskSubtask::class)->orderBy('position');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(TaskComment::class)->orderByDesc('created_at');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(TaskAttachment::class)->orderByDesc('created_at');
    }

    public function timeEntries(): HasMany
    {
        return $this->hasMany(TimeEntry::class);
    }
}
