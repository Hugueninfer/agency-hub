<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Str;

abstract class BaseAuthenticatableWithUuid extends Authenticatable
{
    protected static function booted(): void
    {
        static::saving(function (self $model): void {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }
}
