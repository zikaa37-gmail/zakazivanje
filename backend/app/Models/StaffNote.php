<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['author_id', 'title', 'body', 'taken_by', 'taken_at', 'resolved_at', 'resolved_by', 'last_reply_at'])]
class StaffNote extends Model
{
    protected function casts(): array
    {
        return [
            'taken_at' => 'datetime',
            'resolved_at' => 'datetime',
            'last_reply_at' => 'datetime',
        ];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function taker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'taken_by');
    }

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    public function recipients(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'staff_note_recipients')->withPivot('read_at');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(StaffNoteReply::class)->orderBy('id');
    }
}
