<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'category', 'description', 'address', 'city', 'phone', 'whatsapp_number', 'email', 'website', 'instagram', 'pib', 'registration_number', 'logo', 'theme_primary', 'theme_secondary', 'theme_tertiary', 'booking_confirmation'])]
class BusinessSetting extends Model
{
    public const CATEGORIES = [
        'hair_salon', 'barber', 'beauty_salon', 'spa', 'nail_salon', 'massage', 'tattoo',
        'dental', 'fitness', 'personal_trainer', 'medical', 'other',
    ];

    public const CONFIRMATION_MANUAL = 'manual';

    public const CONFIRMATION_AUTOMATIC = 'automatic';

    public const CONFIRMATION_MODES = [self::CONFIRMATION_MANUAL, self::CONFIRMATION_AUTOMATIC];

    public static function current(): self
    {
        return static::query()->firstOrCreate([], ['name' => config('app.name'), 'category' => 'other']);
    }
}
