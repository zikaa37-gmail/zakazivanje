<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'category', 'description', 'address', 'city', 'phone', 'whatsapp_number', 'email', 'website', 'instagram', 'facebook', 'tiktok', 'youtube', 'pib', 'registration_number', 'logo', 'theme_primary', 'theme_secondary', 'theme_tertiary', 'booking_confirmation', 'slot_interval_minutes', 'booking_lead_minutes', 'booking_horizon_days', 'booking_min_days_ahead', 'cancellation_days_before', 'allow_guest_booking', 'notify_booking_received', 'notify_booking_confirmed', 'notify_booking_cancelled', 'reminder_hours', 'notify_admin_new_booking'])]
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
            'booking_min_days_ahead' => 'integer',
            'cancellation_days_before' => 'integer',
            'allow_guest_booking' => 'boolean',
            'notify_booking_received' => 'boolean',
            'notify_booking_confirmed' => 'boolean',
            'notify_booking_cancelled' => 'boolean',
            'reminder_hours' => 'integer',
            'notify_admin_new_booking' => 'boolean',
        ];
    }

    public function earliestOnlineStart(): CarbonImmutable
    {
        $byLead = CarbonImmutable::now()->addMinutes($this->booking_lead_minutes);
        $byDays = CarbonImmutable::today()->addDays($this->booking_min_days_ahead);

        return $byLead->max($byDays);
    }

    public function cancellationDeadline(CarbonInterface $start): CarbonImmutable
    {
        $start = CarbonImmutable::instance($start);

        return $this->cancellation_days_before === 0
            ? $start
            : $start->startOfDay()->subDays($this->cancellation_days_before - 1);
    }

    public function cancellationLabel(): string
    {
        return match ($this->cancellation_days_before) {
            0 => 'do početka termina',
            1 => 'najkasnije dan pre termina',
            default => "najkasnije {$this->cancellation_days_before} dana pre termina",
        };
    }

    public static function current(): self
    {
        return static::query()->firstOrCreate([], ['name' => config('app.name'), 'category' => 'other']);
    }
}
