<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['first_name', 'last_name', 'title', 'phone', 'email', 'color', 'booking_confirmation', 'avatar', 'active', 'sort_order'])]
class StaffMember extends Model
{
    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function confirmationMode(): string
    {
        return $this->booking_confirmation ?? BusinessSetting::current()->booking_confirmation;
    }

    public function workingHours(): HasMany
    {
        return $this->hasMany(StaffWorkingHour::class)->orderBy('weekday')->orderBy('starts_at');
    }

    public function services(): BelongsToMany
    {
        return $this->belongsToMany(Service::class);
    }
}
