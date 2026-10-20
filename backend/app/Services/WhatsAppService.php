<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    public function isConfigured(): bool
    {
        return filled(config('whatsapp.twilio_account_sid'))
            && filled(config('whatsapp.twilio_auth_token'))
            && filled(config('whatsapp.from'));
    }

    public function sendMessage(string $phoneNumber, string $text): ?string
    {
        if (! $this->isConfigured()) {
            Log::info('[WhatsApp] Twilio nije podešen, poruka nije poslata -> '.$phoneNumber.': '.$text);

            return 'Twilio nije podešen';
        }

        $accountSid = config('whatsapp.twilio_account_sid');

        try {
            $response = Http::asForm()
                ->withBasicAuth($accountSid, config('whatsapp.twilio_auth_token'))
                ->post(config('whatsapp.api_base_url')."/Accounts/{$accountSid}/Messages.json", [
                    'From' => 'whatsapp:'.config('whatsapp.from'),
                    'To' => 'whatsapp:'.$phoneNumber,
                    'Body' => $text,
                ]);
        } catch (\Throwable $e) {
            Log::warning('[WhatsApp] Greška pri slanju poruke: '.$e->getMessage(), ['to' => $phoneNumber]);

            return $e->getMessage();
        }

        if (! $response->successful()) {
            Log::warning('[WhatsApp] Slanje poruke nije uspelo', ['to' => $phoneNumber, 'status' => $response->status(), 'response' => $response->json()]);

            return 'Twilio HTTP '.$response->status();
        }

        return null;
    }

    public static function normalizePhone(?string $phone): ?string
    {
        $digits = preg_replace('/[^\d+]/', '', (string) $phone);
        if ($digits === '' || $digits === '+') {
            return null;
        }

        if (str_starts_with($digits, '00')) {
            $digits = '+'.substr($digits, 2);
        } elseif (str_starts_with($digits, '0')) {
            $digits = '+381'.substr($digits, 1);
        } elseif (! str_starts_with($digits, '+')) {
            $digits = '+'.$digits;
        }

        return preg_match('/^\+\d{8,15}$/', $digits) ? $digits : null;
    }
}
