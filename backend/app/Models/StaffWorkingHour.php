<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['weekday', 'starts_at', 'ends_at'])]
#[Hidden(['created_at', 'updated_at'])]
class StaffWorkingHour extends Model
{
    protected function casts(): array
    {
        return ['weekday' => 'integer'];
    }

    public function staffMember(): BelongsTo
    {
        return $this->belongsTo(StaffMember::class);
    }

    protected function startsAt(): Attribute
    {
        return Attribute::get(fn (string $value) => substr($value, 0, 5));
    }

    protected function endsAt(): Attribute
    {
        return Attribute::get(fn (string $value) => substr($value, 0, 5));
    }
}
