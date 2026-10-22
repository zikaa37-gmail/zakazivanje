<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessSetting;
use App\Models\StaffWorkingHour;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class BusinessSettingController extends Controller
{
    private const PHONE_PATTERN = 'regex:/^[\d\s+\-()]+$/';

    public function show()
    {
        $hours = StaffWorkingHour::query()
            ->whereHas('staffMember', fn ($q) => $q->where('active', true))
            ->get()
            ->groupBy('weekday');

        $openingHours = collect(range(1, 7))->map(fn ($day) => [
            'weekday' => $day,
            'opens_at' => $hours->get($day)?->min('starts_at'),
            'closes_at' => $hours->get($day)?->max('ends_at'),
        ]);

        return [...BusinessSetting::current()->toArray(), 'opening_hours' => $openingHours];
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:200'],
            'category' => ['required', Rule::in(BusinessSetting::CATEGORIES)],
            'description' => ['nullable', 'string', 'max:5000'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:30', self::PHONE_PATTERN],
            'whatsapp_number' => ['nullable', 'string', 'max:30', self::PHONE_PATTERN],
            'email' => ['nullable', 'email', 'max:255'],
            'website' => ['nullable', 'url', 'max:255'],
            'instagram' => ['nullable', 'string', 'max:255'],
            'facebook' => ['nullable', 'string', 'max:255'],
            'tiktok' => ['nullable', 'string', 'max:255'],
            'youtube' => ['nullable', 'string', 'max:255'],
            'pib' => ['nullable', 'string', 'max:20'],
            'registration_number' => ['nullable', 'string', 'max:50'],
            'logo' => ['nullable', 'string', 'max:2000000', 'regex:/^data:image\/(png|jpeg|webp|svg\+xml);base64,/'],
            'theme_primary' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'theme_secondary' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'theme_tertiary' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'booking_confirmation' => ['required', Rule::in(BusinessSetting::CONFIRMATION_MODES)],
            'slot_interval_minutes' => ['sometimes', 'integer', Rule::in([5, 10, 15, 20, 30, 45, 60])],
            'booking_lead_minutes' => ['sometimes', 'integer', 'min:0', 'max:10080'],
            'booking_horizon_days' => ['sometimes', 'integer', 'min:1', 'max:365'],
            'booking_min_days_ahead' => ['sometimes', 'integer', Rule::in([0, 1, 2])],
            'cancellation_days_before' => ['sometimes', 'integer', Rule::in([0, 1, 2, 3])],
            'allow_guest_booking' => ['sometimes', 'boolean'],
            'notify_booking_received' => ['sometimes', 'boolean'],
            'notify_booking_confirmed' => ['sometimes', 'boolean'],
            'notify_booking_cancelled' => ['sometimes', 'boolean'],
            'reminder_hours' => ['sometimes', 'integer', Rule::in([0, 2, 3, 6, 12, 24, 48])],
            'notify_admin_new_booking' => ['sometimes', 'boolean'],
            'bank_account' => ['nullable', 'string', 'regex:/^\d{3}-\d{1,13}-\d{2}$/'],
            'payee_name' => ['nullable', 'string', 'max:70'],
            'payee_address' => ['nullable', 'string', 'max:120'],
            'payment_code' => ['sometimes', 'regex:/^\d{3}$/'],
            'online_payment_enabled' => ['sometimes', 'boolean'],
        ], [
            'bank_account.regex' => 'Račun upiši u obliku 160-0000000000000-00.',
            'payment_code.regex' => 'Šifra plaćanja ima tri cifre (npr. 289).',
        ]);

        $account = array_key_exists('bank_account', $data) ? $data['bank_account'] : BusinessSetting::current()->bank_account;
        if (($data['online_payment_enabled'] ?? false) && ! $account) {
            throw ValidationException::withMessages(['bank_account' => ['Za plaćanje unapred upiši tekući račun.']]);
        }

        $settings = BusinessSetting::current();
        $settings->update($data);

        return $settings;
    }
}
