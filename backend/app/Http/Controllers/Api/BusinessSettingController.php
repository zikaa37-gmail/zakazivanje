<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessSetting;
use App\Models\StaffWorkingHour;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

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
            'cancellation_hours' => ['sometimes', 'integer', 'min:0', 'max:336'],
            'allow_guest_booking' => ['sometimes', 'boolean'],
        ]);

        $settings = BusinessSetting::current();
        $settings->update($data);

        return $settings;
    }
}
