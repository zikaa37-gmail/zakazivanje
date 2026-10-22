<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'starts_at', 'ends_at', 'sort_order'])]
#[Hidden(['created_at', 'updated_at'])]
class Shift extends Model
{
    protected function casts(): array
    {
        return ['sort_order' => 'integer'];
    }

    protected function startsAt(): Attribute
    {
        return Attribute::get(fn (string $value) => substr($value, 0, 5));
    }

    protected function endsAt(): Attribute
    {
        return Attribute::get(fn (string $value) => substr($value, 0, 5));
    }
}
