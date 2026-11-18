<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Auth;

#[Fillable(['client_id', 'staff_member_id', 'recurrence_id', 'starts_at', 'ends_at', 'processing_offset', 'processing_minutes', 'status', 'source', 'price', 'discount', 'total', 'note', 'admin_note', 'completion_note', 'confirmed_at', 'cancelled_at', 'cancelled_by', 'free_change_reason', 'change_notice', 'change_notice_at', 'paid_at', 'payment_method', 'tip', 'link_group'])]
#[Hidden(['change_notice', 'admin_note', 'completion_note'])]
class Appointment extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_CONFIRMED = 'confirmed';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_NO_SHOW = 'no_show';

    public const STATUSES = [self::STATUS_PENDING, self::STATUS_CONFIRMED, self::STATUS_COMPLETED, self::STATUS_CANCELLED, self::STATUS_NO_SHOW];

    public const BLOCKING_STATUSES = [self::STATUS_PENDING, self::STATUS_CONFIRMED];

    public const FREE_CHANGE_TRANSFERRED = 'transferred';

    public const FREE_CHANGE_SALON_REQUEST = 'salon_request';

    public const PAYMENT_METHODS = ['cash', 'card', 'bank'];

    public const SOURCE_ONLINE = 'online';

    public const SOURCE_ADMIN = 'admin';

    public const SOURCE_RECURRING = 'recurring';

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime:Y-m-d H:i',
            'ends_at' => 'datetime:Y-m-d H:i',
            'processing_offset' => 'integer',
            'processing_minutes' => 'integer',
            'confirmed_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'paid_at' => 'datetime',
            'change_notice' => 'array',
            'change_notice_at' => 'datetime',
            'price' => 'float',
            'discount' => 'float',
            'total' => 'float',
            'tip' => 'float',
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

    public function review(): HasOne
    {
        return $this->hasOne(Review::class);
    }

    public function toArray(): array
    {
        $array = parent::toArray();
        if (Auth::user()?->isStaff()) {
            foreach (['admin_note', 'completion_note'] as $key) {
                if (array_key_exists($key, $this->getAttributes())) {
                    $array[$key] = $this->getAttribute($key);
                }
            }
        }

        return $array;
    }

    public function items(): HasMany
    {
        return $this->hasMany(AppointmentItem::class);
    }

    public function processing(): ?array
    {
        return $this->processing_offset && $this->processing_minutes
            ? ['offset' => $this->processing_offset, 'minutes' => $this->processing_minutes]
            : null;
    }

    public function linkedSiblings(): Collection
    {
        if (! $this->link_group) {
            return new Collection;
        }

        return self::query()
            ->where('link_group', $this->link_group)
            ->whereKeyNot($this->id)
            ->blocking()
            ->with(['items', 'staffMember:id,first_name,last_name,title,color'])
            ->orderBy('starts_at')
            ->get();
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
