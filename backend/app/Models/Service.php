<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Attributes\Appends;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['name', 'description', 'service_category_id', 'audience', 'booking_confirmation', 'duration_minutes', 'price', 'active', 'paused_until', 'sort_order'])]
#[Appends(['category'])]
#[Hidden(['serviceCategory'])]
class Service extends Model
{
    protected $with = ['serviceCategory'];

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
            'service_category_id' => 'integer',
            'paused_until' => 'date:Y-m-d',
            'sort_order' => 'integer',
        ];
    }

    public function serviceCategory(): BelongsTo
    {
        return $this->belongsTo(ServiceCategory::class);
    }

    protected function category(): Attribute
    {
        return Attribute::get(fn () => $this->serviceCategory?->name);
    }

    public function isOfferedOnline(): bool
    {
        return $this->active && ($this->serviceCategory === null || $this->serviceCategory->active);
    }

    #[Scope]
    protected function offeredOnline(Builder $query): void
    {
        $query->where('active', true)
            ->where(fn ($q) => $q->whereNull('service_category_id')->orWhereHas('serviceCategory', fn ($c) => $c->where('active', true)));
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
