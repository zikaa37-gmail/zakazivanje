<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['name', 'description', 'category', 'audience', 'booking_confirmation', 'duration_minutes', 'price', 'active', 'paused_until', 'sort_order'])]
class Service extends Model
{
    public const AUDIENCE_ALL = 'all';

    public const AUDIENCES = [self::AUDIENCE_ALL, User::GENDER_FEMALE, User::GENDER_MALE];

    public function suits(?string $gender): bool
    {
        return $this->audience === self::AUDIENCE_ALL || $gender === null || $this->audience === $gender;
    }

    protected function casts(): array
    {
        return [
            'price' => 'float',
            'duration_minutes' => 'integer',
            'active' => 'boolean',
            'paused_until' => 'date:Y-m-d',
            'sort_order' => 'integer',
        ];
    }

    public function staffMembers(): BelongsToMany
    {
        return $this->belongsToMany(StaffMember::class);
    }

    public function promotions(): BelongsToMany
    {
        return $this->belongsToMany(Promotion::class)->withPivot('quantity');
    }

    public function isPausedOn(CarbonInterface $date): bool
    {
        return $this->paused_until !== null && $date->copy()->startOfDay()->lte($this->paused_until);
    }
}
