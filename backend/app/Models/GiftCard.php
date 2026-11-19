<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['code', 'kind', 'card_number', 'amount', 'balance', 'buyer_name', 'recipient_name', 'owner_id', 'note', 'payment_method', 'expires_on', 'sold_by', 'cancelled_at'])]
class GiftCard extends Model
{
    public const string KIND_DIGITAL = 'digital';

    public const string KIND_PHYSICAL = 'physical';

    public const string STATUS_ACTIVE = 'active';

    public const string STATUS_USED = 'used';

    public const string STATUS_EXPIRED = 'expired';

    public const string STATUS_CANCELLED = 'cancelled';

    public const array KINDS = [self::KIND_DIGITAL, self::KIND_PHYSICAL];

    public const array STATUSES = [self::STATUS_ACTIVE, self::STATUS_USED, self::STATUS_EXPIRED, self::STATUS_CANCELLED];

    protected $appends = ['status'];

    protected function casts(): array
    {
        return [
            'amount' => 'float',
            'balance' => 'float',
            'expires_on' => 'date:Y-m-d',
            'cancelled_at' => 'datetime',
        ];
    }

    protected function status(): Attribute
    {
        return Attribute::get(fn (): string => match (true) {
            $this->cancelled_at !== null => self::STATUS_CANCELLED,
            $this->balance <= 0 => self::STATUS_USED,
            $this->expires_on !== null && $this->expires_on->endOfDay()->isPast() => self::STATUS_EXPIRED,
            default => self::STATUS_ACTIVE,
        });
    }

    public function scopeStatus(Builder $query, string $status): Builder
    {
        $today = now()->toDateString();

        return match ($status) {
            self::STATUS_CANCELLED => $query->whereNotNull('cancelled_at'),
            self::STATUS_USED => $query->whereNull('cancelled_at')->where('balance', '<=', 0),
            self::STATUS_EXPIRED => $query->whereNull('cancelled_at')->where('balance', '>', 0)->where('expires_on', '<', $today),
            default => $query->whereNull('cancelled_at')->where('balance', '>', 0)->where(fn ($q) => $q->whereNull('expires_on')->orWhere('expires_on', '>=', $today)),
        };
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sold_by');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(AppointmentPayment::class);
    }

    public static function normalize(string $code): string
    {
        return strtoupper((string) preg_replace('/[^A-Za-z0-9]/', '', $code));
    }

    public function formattedCode(): string
    {
        return strlen($this->code) === 8 ? substr($this->code, 0, 4).'-'.substr($this->code, 4) : $this->code;
    }
}
