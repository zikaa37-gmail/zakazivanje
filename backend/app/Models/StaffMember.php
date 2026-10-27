<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Attributes\Appends;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Collection;

#[Fillable(['first_name', 'last_name', 'title', 'phone', 'email', 'color', 'booking_confirmation', 'avatar', 'active', 'sort_order', 'rotation_weeks', 'rotation_starts_on'])]
#[Appends(['current_week'])]
class StaffMember extends Model
{
    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'sort_order' => 'integer',
            'rotation_weeks' => 'integer',
            'rotation_starts_on' => 'date:Y-m-d',
        ];
    }

    public function weekIndex(CarbonInterface $date): int
    {
        $weeks = max(1, (int) $this->rotation_weeks);
        if ($weeks === 1) {
            return 0;
        }
        $anchor = CarbonImmutable::parse($this->rotation_starts_on ?? $this->created_at ?? 'today')->startOfWeek();
        $diff = intdiv((int) $anchor->diffInDays(CarbonImmutable::parse($date)->startOfWeek(), false), 7);

        return (($diff % $weeks) + $weeks) % $weeks;
    }

    public function hoursOn(CarbonInterface $date, Collection $openingHours): Collection
    {
        $opening = $openingHours->get($date->isoWeekday());
        if (! $opening?->isOpen()) {
            return collect();
        }
        $week = $this->weekIndex($date);

        return $this->workingHours
            ->filter(fn ($h) => $h->weekday === $date->isoWeekday() && $h->week === $week)
            ->map(fn ($h) => ['starts_at' => max($h->starts_at, $opening->opens_at), 'ends_at' => min($h->ends_at, $opening->closes_at)])
            ->filter(fn ($h) => $h['starts_at'] < $h['ends_at'])
            ->sortBy('starts_at')
            ->values();
    }

    protected function currentWeek(): Attribute
    {
        return Attribute::get(fn () => $this->weekIndex(CarbonImmutable::today()));
    }

    public function confirmationMode(): string
    {
        return $this->booking_confirmation ?? BusinessSetting::current()->booking_confirmation;
    }

    public function workingHours(): HasMany
    {
        return $this->hasMany(StaffWorkingHour::class)->orderBy('week')->orderBy('weekday')->orderBy('starts_at');
    }

    public function account(): HasOne
    {
        return $this->hasOne(User::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function services(): BelongsToMany
    {
        return $this->belongsToMany(Service::class);
    }
}
