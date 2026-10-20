<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['client_id', 'staff_member_id', 'recurrence_id', 'starts_at', 'ends_at', 'status', 'source', 'price', 'discount', 'total', 'note', 'admin_note', 'confirmed_at', 'cancelled_at', 'cancelled_by'])]
class Appointment extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_CONFIRMED = 'confirmed';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_NO_SHOW = 'no_show';

    public const STATUSES = [self::STATUS_PENDING, self::STATUS_CONFIRMED, self::STATUS_COMPLETED, self::STATUS_CANCELLED, self::STATUS_NO_SHOW];

    public const BLOCKING_STATUSES = [self::STATUS_PENDING, self::STATUS_CONFIRMED];

    public const SOURCE_ONLINE = 'online';

    public const SOURCE_ADMIN = 'admin';

    public const SOURCE_RECURRING = 'recurring';

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime:Y-m-d H:i',
            'ends_at' => 'datetime:Y-m-d H:i',
            'confirmed_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'price' => 'float',
            'discount' => 'float',
            'total' => 'float',
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

    public function recurrence(): BelongsTo
    {
        return $this->belongsTo(AppointmentRecurrence::class, 'recurrence_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(AppointmentItem::class);
    }

    public function scopeBlocking(Builder $query): Builder
    {
        return $query->whereIn('status', self::BLOCKING_STATUSES);
    }

    public function scopeOverlapping(Builder $query, $from, $to): Builder
    {
        return $query->where('starts_at', '<', $to)->where('ends_at', '>', $from);
    }
}
