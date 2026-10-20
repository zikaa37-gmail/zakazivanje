<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['name', 'description', 'category', 'duration_minutes', 'price', 'active', 'sort_order'])]
class Service extends Model
{
    protected function casts(): array
    {
        return [
            'price' => 'float',
            'duration_minutes' => 'integer',
            'active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function staffMembers(): BelongsToMany
    {
        return $this->belongsToMany(StaffMember::class);
    }

    public function promotions(): BelongsToMany
    {
        return $this->belongsToMany(Promotion::class)->withPivot('quantity');
    }
}
