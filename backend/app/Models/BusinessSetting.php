<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'category', 'description', 'address', 'city', 'phone', 'whatsapp_number', 'email', 'website', 'instagram', 'pib', 'registration_number', 'logo', 'theme_primary', 'theme_secondary', 'theme_tertiary', 'booking_confirmation', 'slot_interval_minutes', 'booking_lead_minutes', 'booking_horizon_days', 'cancellation_hours', 'allow_guest_booking', 'notify_booking_received', 'notify_booking_confirmed', 'notify_booking_cancelled', 'reminder_hours', 'notify_admin_new_booking'])]
class BusinessSetting extends Model
{
    public const CATEGORIES = [
        'hair_salon', 'barber', 'beauty_salon', 'spa', 'nail_salon', 'massage', 'tattoo',
        'dental', 'fitness', 'personal_trainer', 'medical', 'other',
    ];

    public const CONFIRMATION_MANUAL = 'manual';

    public const CONFIRMATION_AUTOMATIC = 'automatic';

    public const CONFIRMATION_MODES = [self::CONFIRMATION_MANUAL, self::CONFIRMATION_AUTOMATIC];

    protected function casts(): array
    {
        return [
            'slot_interval_minutes' => 'integer',
            'booking_lead_minutes' => 'integer',
            'booking_horizon_days' => 'integer',
            'cancellation_hours' => 'integer',
            'allow_guest_booking' => 'boolean',
            'notify_booking_received' => 'boolean',
            'notify_booking_confirmed' => 'boolean',
            'notify_booking_cancelled' => 'boolean',
            'reminder_hours' => 'integer',
            'notify_admin_new_booking' => 'boolean',
        ];
    }

    public static function current(): self
    {
        return static::query()->firstOrCreate([], ['name' => config('app.name'), 'category' => 'other']);
    }
}
