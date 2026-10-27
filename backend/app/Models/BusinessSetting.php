<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Attributes\Appends;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'category', 'description', 'address', 'city', 'phone', 'whatsapp_number', 'email', 'website', 'instagram', 'facebook', 'tiktok', 'youtube', 'pib', 'registration_number', 'logo', 'theme_primary', 'theme_secondary', 'theme_tertiary', 'booking_confirmation', 'slot_interval_minutes', 'booking_lead_minutes', 'booking_horizon_days', 'booking_min_days_ahead', 'cancellation_days_before', 'allow_guest_booking', 'notify_booking_received', 'notify_booking_confirmed', 'notify_booking_cancelled', 'reminder_hours', 'notify_admin_new_booking', 'bank_account', 'payee_name', 'payee_address', 'payment_code', 'online_payment_enabled', 'reviews_enabled', 'notify_review_request', 'cover_image', 'waitlist_enabled', 'report_auto_enabled', 'report_auto_daily', 'report_auto_weekly', 'report_auto_monthly', 'report_auto_channel', 'discipline_enabled', 'discipline_window_days', 'discipline_cancel_points', 'discipline_late_cancel_points', 'discipline_no_show_points', 'discipline_yellow_points', 'discipline_orange_points', 'discipline_red_points', 'discipline_auto_suspend', 'discipline_yellow_min_days', 'discipline_yellow_horizon_days', 'discipline_yellow_off_peak', 'discipline_off_peak_percent'])]
#[Hidden(['cover_image'])]
#[Appends(['cover_url'])]
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
            'online_payment_enabled' => 'boolean',
            'reviews_enabled' => 'boolean',
            'notify_review_request' => 'boolean',
            'waitlist_enabled' => 'boolean',
            'report_auto_enabled' => 'boolean',
            'report_auto_daily' => 'boolean',
            'report_auto_weekly' => 'boolean',
            'report_auto_monthly' => 'boolean',
            'discipline_enabled' => 'boolean',
            'discipline_window_days' => 'integer',
            'discipline_cancel_points' => 'float',
            'discipline_late_cancel_points' => 'float',
            'discipline_no_show_points' => 'float',
            'discipline_yellow_points' => 'float',
            'discipline_orange_points' => 'float',
            'discipline_red_points' => 'float',
            'discipline_auto_suspend' => 'boolean',
            'discipline_yellow_min_days' => 'integer',
            'discipline_yellow_horizon_days' => 'integer',
            'discipline_yellow_off_peak' => 'boolean',
            'discipline_off_peak_percent' => 'integer',
        ];
    }

    protected function coverUrl(): Attribute
    {
        return Attribute::get(fn () => $this->cover_image ? '/public/business/cover?v='.$this->updated_at?->timestamp : null);
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
