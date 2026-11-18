<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'amount', 'kind', 'payment_method', 'appointment_id', 'gift_card_id', 'note', 'created_by'])]
class WalletEntry extends Model
{
    public const KIND_DEPOSIT = 'deposit';

    public const KIND_GIFT_CARD = 'gift_card';

    public const KIND_PAYMENT = 'payment';

    public const KIND_REFUND = 'refund';

    public const KIND_ADJUSTMENT = 'adjustment';

    protected function casts(): array
    {
        return ['amount' => 'float'];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function giftCard(): BelongsTo
    {
        return $this->belongsTo(GiftCard::class);
    }
}
