<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['client_id', 'appointment_id', 'started_by', 'assigned_to', 'expires_at', 'closed_at', 'closed_by', 'last_message_at'])]
class ChatSession extends Model
{
    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'closed_at' => 'datetime',
            'last_message_at' => 'datetime',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ChatMessage::class);
    }

    public function isActive(): bool
    {
        return $this->closed_at === null && $this->expires_at->isFuture();
    }

    public function scopeActive(Builder $query): void
    {
        $query->whereNull('closed_at')->where('expires_at', '>', now());
    }

    public function scopeInactive(Builder $query): void
    {
        $query->where(fn ($q) => $q->whereNotNull('closed_at')->orWhere('expires_at', '<=', now()));
    }
}
