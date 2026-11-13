<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['staff_member_id', 'starts_on', 'ends_on', 'type', 'note', 'status', 'requested_by', 'decided_by', 'decided_at', 'blocked_time_id'])]
class StaffAbsence extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    public const TYPES = ['sick', 'vacation', 'other'];

    public const TYPE_LABELS = ['sick' => 'Bolovanje', 'vacation' => 'Odmor', 'other' => 'Odsustvo'];

    protected function casts(): array
    {
        return [
            'starts_on' => 'date:Y-m-d',
            'ends_on' => 'date:Y-m-d',
            'decided_at' => 'datetime',
        ];
    }

    public function staffMember(): BelongsTo
    {
        return $this->belongsTo(StaffMember::class);
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function decider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }

    public function blockedTime(): BelongsTo
    {
        return $this->belongsTo(BlockedTime::class);
    }

    public function typeLabel(): string
    {
        return self::TYPE_LABELS[$this->type] ?? 'Odsustvo';
    }

    public function periodLabel(): string
    {
        return $this->starts_on->equalTo($this->ends_on)
            ? $this->starts_on->format('d.m.Y.')
            : $this->starts_on->format('d.m.').' – '.$this->ends_on->format('d.m.Y.');
    }
}
