<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class TimeEntry extends BaseModel
{
    protected $fillable = [
        'uuid',
        'tenant_id',
        'user_id',
        'task_id',
        'project_id',
        'source',
        'started_at',
        'ended_at',
        'duration_minutes',
        'worked_date',
    ];

    public const SOURCE_TIMER = 'timer';

    public const SOURCE_MANUAL = 'manual';

    /** @return list<string> */
    public static function sources(): array
    {
        return [self::SOURCE_TIMER, self::SOURCE_MANUAL];
    }

    protected static function booted(): void
    {
        static::saving(function (self $entry): void {
            if (empty($entry->uuid)) {
                $entry->uuid = (string) Str::uuid();
            }
        });
    }

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'worked_date' => 'date',
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

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
