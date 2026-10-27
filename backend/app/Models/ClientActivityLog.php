<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'type', 'data', 'actor_id', 'ip', 'user_agent'])]
class ClientActivityLog extends Model
{
    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return ['data' => 'array', 'created_at' => 'datetime:Y-m-d H:i:s'];
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
