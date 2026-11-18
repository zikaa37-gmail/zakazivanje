<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['code', 'kind', 'card_number', 'amount', 'balance', 'buyer_name', 'recipient_name', 'owner_id', 'note', 'payment_method', 'expires_on', 'sold_by', 'cancelled_at'])]
class GiftCard extends Model
{
    public const KIND_DIGITAL = 'digital';

    public const KIND_PHYSICAL = 'physical';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_USED = 'used';

    public const STATUS_EXPIRED = 'expired';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUSES = [self::STATUS_ACTIVE, self::STATUS_USED, self::STATUS_EXPIRED, self::STATUS_CANCELLED];

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

    public function getStatusAttribute(): string
    {
        if ($this->cancelled_at) {
            return self::STATUS_CANCELLED;
        }
        if ($this->balance <= 0) {
            return self::STATUS_USED;
        }
        if ($this->expires_on && $this->expires_on->endOfDay()->isPast()) {
            return self::STATUS_EXPIRED;
        }

        return self::STATUS_ACTIVE;
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
        return strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $code));
    }

    public function formattedCode(): string
    {
        return strlen($this->code) === 8 ? substr($this->code, 0, 4).'-'.substr($this->code, 4) : $this->code;
    }
}
