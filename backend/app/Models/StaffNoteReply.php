<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['staff_note_id', 'author_id', 'body'])]
class StaffNoteReply extends Model
{
    public function note(): BelongsTo
    {
        return $this->belongsTo(StaffNote::class, 'staff_note_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
