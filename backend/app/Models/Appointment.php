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

#[Fillable(['client_id', 'staff_member_id', 'recurrence_id', 'starts_at', 'ends_at', 'processing_offset', 'processing_minutes', 'status', 'service_outcome', 'source', 'price', 'discount', 'total', 'due_amount', 'paid_amount', 'note', 'admin_note', 'completion_note', 'confirmed_at', 'cancelled_at', 'cancelled_by', 'free_change_reason', 'change_notice', 'change_notice_at', 'paid_at', 'payment_method', 'tip', 'link_group'])]
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

    public const OUTCOME_DONE = 'done';

    public const OUTCOME_PARTIAL = 'partial';

    public const OUTCOME_NOT_DONE = 'not_done';

    public const OUTCOMES = [self::OUTCOME_DONE, self::OUTCOME_PARTIAL, self::OUTCOME_NOT_DONE];

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
            'due_amount' => 'float',
            'paid_amount' => 'float',
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
            if (array_key_exists('total', $this->getAttributes()) && array_key_exists('status', $this->getAttributes())) {
                $array['outstanding'] = $this->outstanding();
            }
        }

        return $array;
    }

    public function dueAmount(): float
    {
        if ($this->status !== self::STATUS_COMPLETED) {
            return 0.0;
        }

        return round((float) ($this->due_amount ?? $this->total), 2);
    }

    public function paidAmount(): float
    {
        if ($this->paid_amount !== null) {
            return round((float) $this->paid_amount, 2);
        }

        return $this->paid_at ? round((float) $this->total, 2) : 0.0;
    }

    public function outstanding(): float
    {
        return max(0.0, round($this->dueAmount() - $this->paidAmount(), 2));
    }

    public function amountLeft(): float
    {
        if ($this->status === self::STATUS_COMPLETED) {
            return $this->outstanding();
        }

        return max(0.0, round((float) $this->total - $this->paidAmount(), 2));
    }

    public function scopeOutstanding(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_COMPLETED)
            ->whereRaw('coalesce(paid_amount, 0) < coalesce(due_amount, total)');
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
