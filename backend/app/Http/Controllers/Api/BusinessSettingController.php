<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessSetting;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BusinessSettingController extends Controller
{
    private const PHONE_PATTERN = 'regex:/^[\d\s+\-()]+$/';

    public function show()
    {
        return BusinessSetting::current();
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
        ]);

        $settings = BusinessSetting::current();
        $settings->update($data);

        return $settings;
    }
}
