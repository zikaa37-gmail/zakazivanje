<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['name', 'code', 'max_uses', 'once_per_client', 'type', 'description', 'discount_percent', 'discount_amount', 'package_price', 'buy_quantity', 'free_quantity', 'loyalty_visits', 'starts_on', 'ends_on', 'weekdays', 'active'])]
class Promotion extends Model
{
    public const TYPE_PERCENT = 'discount_percent';

    public const TYPE_AMOUNT = 'discount_amount';

    public const TYPE_BUNDLE = 'bundle';

    public const TYPE_PACKAGE = 'package';

    public const TYPE_LOYALTY = 'loyalty';

    public const TYPES = [self::TYPE_PERCENT, self::TYPE_AMOUNT, self::TYPE_BUNDLE, self::TYPE_PACKAGE, self::TYPE_LOYALTY];

    protected function casts(): array
    {
        return [
            'discount_percent' => 'float',
            'discount_amount' => 'float',
            'package_price' => 'float',
            'buy_quantity' => 'integer',
            'free_quantity' => 'integer',
            'loyalty_visits' => 'integer',
            'starts_on' => 'date:Y-m-d',
            'ends_on' => 'date:Y-m-d',
            'weekdays' => 'array',
            'active' => 'boolean',
            'max_uses' => 'integer',
            'once_per_client' => 'boolean',
        ];
    }

    public function services(): BelongsToMany
    {
        return $this->belongsToMany(Service::class)->withPivot('quantity');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('active', true);
    }

    public function isValidOn(CarbonInterface $date): bool
    {
        if (! $this->active) {
            return false;
        }

        if ($this->starts_on && $date->lt($this->starts_on->startOfDay())) {
            return false;
        }

        if ($this->ends_on && $date->gt($this->ends_on->endOfDay())) {
            return false;
        }

        return empty($this->weekdays) || in_array($date->isoWeekday(), $this->weekdays, true);
    }

    public function appliesToService(int $serviceId): bool
    {
        $ids = $this->services->pluck('id');

        return $ids->isEmpty() || $ids->contains($serviceId);
    }

    public static function normalizeCode(?string $code): ?string
    {
        $code = strtoupper(preg_replace('/\s+/', '', (string) $code));

        return $code === '' ? null : $code;
    }

    public function uses(?int $clientId = null): int
    {
        return AppointmentItem::query()
            ->where('promotion_id', $this->id)
            ->whereHas('appointment', fn ($q) => $q->where('status', '!=', Appointment::STATUS_CANCELLED)
                ->when($clientId, fn ($q) => $q->where('client_id', $clientId)))
            ->distinct()
            ->count('appointment_id');
    }

    public function codeProblem(?int $clientId): ?string
    {
        if ($this->max_uses !== null && $this->uses() >= $this->max_uses) {
            return 'Ovaj kod je iskorišćen maksimalan broj puta.';
        }
        if ($this->once_per_client && $clientId && $this->uses($clientId) > 0) {
            return 'Ovaj kod si već iskoristio/la.';
        }

        return null;
    }
}
