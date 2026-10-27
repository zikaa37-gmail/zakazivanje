<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessSetting;
use App\Models\OpeningHour;
use App\Models\Shift;
use App\Notifications\ReportNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class BusinessSettingController extends Controller
{
    private const PHONE_PATTERN = 'regex:/^[\d\s+\-()]+$/';

    public function show(Request $request)
    {
        $settings = $this->present(BusinessSetting::current());

        return $request->user()?->isStaff()
            ? $settings
            : collect($settings)->reject(fn ($v, $key) => str_starts_with($key, 'discipline_') || str_starts_with($key, 'report_auto_'))->all();
    }

    private function present(BusinessSetting $settings): array
    {
        $week = OpeningHour::week();

        return [
            ...$settings->toArray(),
            'opening_hours' => collect(range(1, 7))->map(fn ($day) => [
                'weekday' => $day,
                'opens_at' => $week->get($day)?->opens_at,
                'closes_at' => $week->get($day)?->closes_at,
            ])->all(),
            'shifts' => Shift::query()->orderBy('sort_order')->orderBy('starts_at')->get(['id', 'name', 'starts_at', 'ends_at', 'sort_order']),
        ];
    }

    public function cover()
    {
        $data = BusinessSetting::current()->cover_image;
        abort_unless($data && preg_match('/^data:(image\/[a-z]+);base64,(.+)$/s', $data, $match), 404);

        return response(base64_decode($match[2]), 200, [
            'Content-Type' => $match[1],
            'Cache-Control' => 'public, max-age=604800',
        ]);
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
            'cover_image' => ['sometimes', 'nullable', 'string', 'max:4000000', 'regex:/^data:image\/(jpeg|webp|png);base64,/'],
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
            'reviews_enabled' => ['sometimes', 'boolean'],
            'notify_review_request' => ['sometimes', 'boolean'],
            'waitlist_enabled' => ['sometimes', 'boolean'],
            'report_auto_enabled' => ['sometimes', 'boolean'],
            'report_auto_daily' => ['sometimes', 'boolean'],
            'report_auto_weekly' => ['sometimes', 'boolean'],
            'report_auto_monthly' => ['sometimes', 'boolean'],
            'discipline_enabled' => ['sometimes', 'boolean'],
            'discipline_window_days' => ['sometimes', 'integer', 'between:7,365'],
            'discipline_cancel_points' => ['sometimes', 'numeric', 'between:0,20'],
            'discipline_late_cancel_points' => ['sometimes', 'numeric', 'between:0,20'],
            'discipline_no_show_points' => ['sometimes', 'numeric', 'between:0,20'],
            'discipline_yellow_points' => ['sometimes', 'numeric', 'between:0.5,100'],
            'discipline_orange_points' => ['sometimes', 'numeric', 'between:0.5,100', 'gte:discipline_yellow_points'],
            'discipline_red_points' => ['sometimes', 'numeric', 'between:0.5,100', 'gte:discipline_orange_points'],
            'discipline_auto_suspend' => ['sometimes', 'boolean'],
            'discipline_yellow_min_days' => ['sometimes', 'integer', 'between:0,30'],
            'discipline_yellow_horizon_days' => ['sometimes', 'integer', 'between:1,90'],
            'report_auto_channel' => ['sometimes', Rule::in([ReportNotification::CHANNEL_MAIL, ReportNotification::CHANNEL_WHATSAPP])],
            'opening_hours' => ['sometimes', 'array', 'size:7'],
            'opening_hours.*.weekday' => ['required', 'integer', 'between:1,7', 'distinct'],
            'opening_hours.*.opens_at' => ['nullable', 'date_format:H:i', 'required_with:opening_hours.*.closes_at'],
            'opening_hours.*.closes_at' => ['nullable', 'date_format:H:i', 'required_with:opening_hours.*.opens_at', 'after:opening_hours.*.opens_at'],
            'shifts' => ['sometimes', 'array', 'max:10'],
            'shifts.*.name' => ['required', 'string', 'max:50'],
            'shifts.*.starts_at' => ['required', 'date_format:H:i'],
            'shifts.*.ends_at' => ['required', 'date_format:H:i', 'after:shifts.*.starts_at'],
        ], [
            'bank_account.regex' => 'Račun upiši u obliku 160-0000000000000-00.',
            'payment_code.regex' => 'Šifra plaćanja ima tri cifre (npr. 289).',
            'cover_image.max' => 'Fotografija je prevelika.',
            'cover_image.regex' => 'Fotografija mora biti JPG, PNG ili WEBP.',
            'opening_hours.*.closes_at.after' => 'Zatvaranje mora biti posle otvaranja.',
            'shifts.*.ends_at.after' => 'Kraj smene mora biti posle početka.',
            'shifts.*.name.required' => 'Upiši naziv smene.',
        ]);

        $account = array_key_exists('bank_account', $data) ? $data['bank_account'] : BusinessSetting::current()->bank_account;
        if (($data['online_payment_enabled'] ?? false) && ! $account) {
            throw ValidationException::withMessages(['bank_account' => ['Za plaćanje unapred upiši tekući račun.']]);
        }

        $settings = BusinessSetting::current();
        DB::transaction(function () use ($settings, $data) {
            $settings->update(collect($data)->except(['opening_hours', 'shifts'])->all());

            foreach ($data['opening_hours'] ?? [] as $day) {
                OpeningHour::updateOrCreate(['weekday' => $day['weekday']], ['opens_at' => $day['opens_at'] ?? null, 'closes_at' => $day['closes_at'] ?? null]);
            }

            if (array_key_exists('shifts', $data)) {
                Shift::query()->delete();
                foreach (array_values($data['shifts']) as $i => $shift) {
                    Shift::create([...$shift, 'sort_order' => $i]);
                }
            }
        });

        return $this->present($settings->refresh());
    }
}
