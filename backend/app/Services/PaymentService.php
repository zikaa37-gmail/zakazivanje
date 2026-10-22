<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\BusinessSetting;
use Barryvdh\DomPDF\Facade\Pdf;
use chillerlan\QRCode\Common\EccLevel;
use chillerlan\QRCode\Output\QRGdImagePNG;
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use RuntimeException;

class PaymentService
{
    public const MODEL = '97';

    public function account18(?string $account): ?string
    {
        $parts = explode('-', preg_replace('/[^0-9-]/', '', (string) $account));
        if (count($parts) !== 3 || strlen($parts[0]) !== 3 || strlen($parts[2]) !== 2 || $parts[1] === '' || strlen($parts[1]) > 13) {
            return null;
        }

        return $parts[0].str_pad($parts[1], 13, '0', STR_PAD_LEFT).$parts[2];
    }

    public static function mod97Reference(string $base): string
    {
        $remainder = 0;
        foreach (str_split($base.'00') as $digit) {
            $remainder = ($remainder * 10 + (int) $digit) % 97;
        }

        return sprintf('%02d', 98 - $remainder).$base;
    }

    public function reference(Appointment $appointment): string
    {
        return self::mod97Reference('1'.str_pad((string) $appointment->id, 8, '0', STR_PAD_LEFT));
    }

    public function assertPayable(Appointment $appointment): void
    {
        if ($appointment->paid_at) {
            throw new RuntimeException('Termin je već plaćen.');
        }
        if (in_array($appointment->status, [Appointment::STATUS_CANCELLED, Appointment::STATUS_NO_SHOW], true)) {
            throw new RuntimeException('Otkazan termin se ne plaća.');
        }
        if ($appointment->total <= 0) {
            throw new RuntimeException('Termin nema iznos za plaćanje.');
        }
    }

    public function details(Appointment $appointment): array
    {
        $this->assertPayable($appointment);
        $appointment->loadMissing(['items', 'client']);
        $services = $appointment->items->pluck('name')->implode(' + ');
        $purpose = 'Termin '.$appointment->starts_at->format('d.m.').' '.$services;
        $payer = trim(($appointment->client?->first_name ?? '').' '.($appointment->client?->last_name ?? ''));

        return [
            'appointment_id' => $appointment->id,
            'starts_at' => $appointment->starts_at->format('Y-m-d H:i'),
            'services' => $services,
            'payer' => $payer,
            ...$this->ips($appointment->total, $purpose, $this->reference($appointment), $payer ?: null),
        ];
    }

    public function ips(float $amount, string $purpose, string $reference, ?string $payer = null): array
    {
        $setting = BusinessSetting::current();
        $account = $this->account18($setting->bank_account);
        if (! $account) {
            throw new RuntimeException('Tekući račun salona nije podešen.');
        }
        $purpose = mb_substr($purpose, 0, 35);
        $payee = trim(($setting->payee_name ?: $setting->name).($setting->payee_address ? "\n".$setting->payee_address : ''));
        $code = $setting->payment_code ?: '289';
        $payload = implode('|', array_filter([
            'K:PR',
            'V:01',
            'C:1',
            'R:'.$account,
            'N:'.mb_substr($payee, 0, 70),
            'I:RSD'.number_format($amount, 2, ',', ''),
            $payer ? 'P:'.mb_substr($payer, 0, 70) : null,
            'SF:'.$code,
            'S:'.$purpose,
            'RO:'.self::MODEL.$reference,
        ]));

        return [
            'amount' => $amount,
            'account' => $setting->bank_account,
            'payee' => $payee,
            'payment_code' => $code,
            'purpose' => $purpose,
            'model' => self::MODEL,
            'reference' => $reference,
            'payload' => $payload,
            'qr' => (new QRCode(new QROptions(['outputInterface' => QRGdImagePNG::class, 'scale' => 6, 'outputBase64' => true, 'eccLevel' => EccLevel::M])))->render($payload),
        ];
    }

    public function slip(Appointment $appointment): string
    {
        $slip = $this->details($appointment);

        return Pdf::loadView('pdf.payment-slip', ['slip' => $slip, 'business' => BusinessSetting::current()->name])->setPaper('a4')->setOption('isFontSubsettingEnabled', true)->output();
    }
}
