<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['staff_member_id', 'starts_at', 'ends_at', 'reason'])]
class BlockedTime extends Model
{
    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime:Y-m-d H:i',
            'ends_at' => 'datetime:Y-m-d H:i',
        ];
    }

    public function staffMember(): BelongsTo
    {
        return $this->belongsTo(StaffMember::class);
    }

    public function scopeAffecting(Builder $query, int $staffMemberId): Builder
    {
        return $query->where(fn ($q) => $q->whereNull('staff_member_id')->orWhere('staff_member_id', $staffMemberId));
    }
}
