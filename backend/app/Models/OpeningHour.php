<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

#[Fillable(['weekday', 'opens_at', 'closes_at'])]
#[Hidden(['id', 'created_at', 'updated_at'])]
class OpeningHour extends Model
{
    protected function casts(): array
    {
        return ['weekday' => 'integer'];
    }

    public static function week(): Collection
    {
        return static::query()->orderBy('weekday')->get()->keyBy('weekday');
    }

    public function isOpen(): bool
    {
        return $this->opens_at !== null && $this->closes_at !== null;
    }

    protected function opensAt(): Attribute
    {
        return Attribute::get(fn (?string $value) => $value === null ? null : substr($value, 0, 5));
    }

    protected function closesAt(): Attribute
    {
        return Attribute::get(fn (?string $value) => $value === null ? null : substr($value, 0, 5));
    }
}
