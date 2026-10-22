<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['client_id', 'staff_member_id', 'date', 'part', 'service_ids', 'notified_at', 'fulfilled_at'])]
class WaitlistEntry extends Model
{
    public const PART_ANY = 'any';

    public const PART_MORNING = 'morning';

    public const PART_AFTERNOON = 'afternoon';

    public const PARTS = [self::PART_ANY, self::PART_MORNING, self::PART_AFTERNOON];

    public const AFTERNOON_FROM = '14:00';

    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
            'service_ids' => 'array',
            'staff_member_id' => 'integer',
            'notified_at' => 'datetime',
            'fulfilled_at' => 'datetime',
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

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNull('fulfilled_at')->where('date', '>=', now()->toDateString());
    }

    public function fitsTime(string $time): bool
    {
        return match ($this->part) {
            self::PART_MORNING => $time < self::AFTERNOON_FROM,
            self::PART_AFTERNOON => $time >= self::AFTERNOON_FROM,
            default => true,
        };
    }

    public function partLabel(): string
    {
        return match ($this->part) {
            self::PART_MORNING => 'pre podne',
            self::PART_AFTERNOON => 'popodne',
            default => 'bilo kad',
        };
    }
}
