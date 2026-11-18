<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['code', 'amount', 'buyer_name', 'recipient_name', 'note', 'payment_method', 'expires_on', 'sold_by', 'redeemed_by', 'redeemed_at', 'cancelled_at'])]
class GiftCard extends Model
{
    public const STATUS_ACTIVE = 'active';

    public const STATUS_REDEEMED = 'redeemed';

    public const STATUS_EXPIRED = 'expired';

    public const STATUS_CANCELLED = 'cancelled';

    protected $appends = ['status'];

    protected function casts(): array
    {
        return [
            'amount' => 'float',
            'expires_on' => 'date:Y-m-d',
            'redeemed_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function getStatusAttribute(): string
    {
        if ($this->cancelled_at) {
            return self::STATUS_CANCELLED;
        }
        if ($this->redeemed_at) {
            return self::STATUS_REDEEMED;
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

    public function redeemer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'redeemed_by');
    }

    public static function normalize(string $code): string
    {
        return strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $code));
    }
}
