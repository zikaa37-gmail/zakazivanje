<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['service_id', 'promotion_id', 'name', 'duration_minutes', 'price', 'discount', 'promotion_name'])]
class AppointmentItem extends Model
{
    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'duration_minutes' => 'integer',
            'price' => 'float',
            'discount' => 'float',
        ];
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }
}
