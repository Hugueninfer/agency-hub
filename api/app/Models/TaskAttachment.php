<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class TaskAttachment extends BaseModel
{
    protected $fillable = [
        'uuid',
        'tenant_id',
        'task_id',
        'uploaded_by',
        'path',
        'original_name',
        'mime',
        'size_bytes',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $model): void {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
