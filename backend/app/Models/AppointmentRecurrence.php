<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['client_id', 'staff_member_id', 'service_ids', 'weekday', 'start_time', 'interval_weeks', 'starts_on', 'ends_on', 'generated_until', 'skipped_dates', 'note', 'active'])]
class AppointmentRecurrence extends Model
{
    protected function casts(): array
    {
        return [
            'service_ids' => 'array',
            'skipped_dates' => 'array',
            'weekday' => 'integer',
            'interval_weeks' => 'integer',
            'starts_on' => 'date:Y-m-d',
            'ends_on' => 'date:Y-m-d',
            'generated_until' => 'date:Y-m-d',
            'active' => 'boolean',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function staffMember(): BelongsTo
    {
        return $this->belongsTo(StaffMember::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class, 'recurrence_id');
    }
}
