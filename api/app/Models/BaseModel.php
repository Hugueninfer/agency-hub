<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

abstract class BaseModel extends Model
{
    /**
     * Safety net for any model that does not declare an explicit $fillable.
     * Concrete models should always whitelist columns via $fillable; this guards
     * the primary key against mass assignment as defense in depth.
     */
    protected $guarded = [
        'id',
    ];
}
