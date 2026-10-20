<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'appointment_id', 'type', 'channel', 'recipient', 'status', 'error'])]
class NotificationLog extends Model
{
    public const UPDATED_AT = null;

    public const STATUS_SENT = 'sent';

    public const STATUS_SKIPPED = 'skipped';

    public const STATUS_FAILED = 'failed';

    protected function casts(): array
    {
        return ['created_at' => 'datetime:Y-m-d H:i'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function record(?User $user, string $type, string $channel, ?string $recipient, string $status, ?int $appointmentId = null, ?string $error = null): void
    {
        static::create([
            'user_id' => $user?->id,
            'appointment_id' => $appointmentId,
            'type' => $type,
            'channel' => $channel,
            'recipient' => $recipient,
            'status' => $status,
            'error' => $error ? mb_substr($error, 0, 250) : null,
        ]);
    }
}
