<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['appointment_id', 'client_id', 'late_number', 'base_amount', 'amount', 'status', 'reason', 'decided_by', 'paid_at', 'payment_method'])]
class CancellationFee extends Model
{
    public const STATUS_FREE = 'free';

    public const STATUS_OPEN = 'open';

    public const STATUS_PAID = 'paid';

    public const STATUS_WAIVED = 'waived';

    public const TYPE_NONE = 'none';

    public const TYPE_FIXED = 'fixed';

    public const TYPE_PERCENT = 'percent';

    public const TYPE_SERVICE_PLUS_FIXED = 'service_plus_fixed';

    public const TYPES = [self::TYPE_FIXED, self::TYPE_PERCENT, self::TYPE_SERVICE_PLUS_FIXED];

    public const DISCOUNT_FIXED = 'fixed';

    public const DISCOUNT_PERCENT = 'percent';

    public const DISCOUNT_EXEMPT = 'exempt';

    public const DISCOUNT_TYPES = [self::DISCOUNT_FIXED, self::DISCOUNT_PERCENT, self::DISCOUNT_EXEMPT];

    protected function casts(): array
    {
        return [
            'late_number' => 'integer',
            'base_amount' => 'float',
            'amount' => 'float',
            'paid_at' => 'datetime',
        ];
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function decider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }
}
