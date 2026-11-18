<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\AppointmentPayment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentLedger
{
    public const WALLET = 'wallet';

    public function __construct(private WalletService $wallet) {}

    public static function methods(): array
    {
        return [...Appointment::PAYMENT_METHODS, self::WALLET];
    }

    public function paidSum(Appointment $appointment): float
    {
        return round((float) AppointmentPayment::where('appointment_id', $appointment->id)->sum('amount'), 2);
    }

    public function settle(Appointment $appointment, float $target, ?string $method, ?User $by): void
    {
        DB::transaction(function () use ($appointment, $target, $method, $by) {
            $delta = round($target - $this->paidSum($appointment), 2);
            if ($delta > 0) {
                if (! $method) {
                    throw ValidationException::withMessages(['payment_method' => ['Izaberi kako je plaćeno.']]);
                }
                $this->add($appointment, $delta, $method, $by);
            } elseif ($delta < 0) {
                $this->reverse($appointment, -$delta, $by);
            }
        });
    }

    private function add(Appointment $appointment, float $amount, string $method, ?User $by): void
    {
        if ($method === self::WALLET) {
            if (! $appointment->client) {
                throw ValidationException::withMessages(['payment_method' => ['Termin nema klijenta sa stanjem.']]);
            }
            $this->wallet->charge($appointment->client, $amount, $appointment, $by);
        }
        AppointmentPayment::create(['appointment_id' => $appointment->id, 'amount' => $amount, 'method' => $method, 'created_by' => $by?->id]);
    }

    private function reverse(Appointment $appointment, float $amount, ?User $by): void
    {
        $left = $amount;
        $payments = AppointmentPayment::where('appointment_id', $appointment->id)->where('amount', '>', 0)->orderByDesc('id')->get();
        $net = $payments->groupBy('method')->map(fn ($rows, $method) => (float) AppointmentPayment::where('appointment_id', $appointment->id)->where('method', $method)->sum('amount'));

        foreach ($payments->pluck('method')->unique() as $method) {
            if ($left <= 0) {
                break;
            }
            $take = round(min($left, $net[$method] ?? 0), 2);
            if ($take <= 0) {
                continue;
            }
            AppointmentPayment::create(['appointment_id' => $appointment->id, 'amount' => -$take, 'method' => $method, 'created_by' => $by?->id]);
            if ($method === self::WALLET && $appointment->client) {
                $this->wallet->refund($appointment->client, $take, $appointment, $by);
            }
            $left = round($left - $take, 2);
        }
    }

    public function byMethod(iterable $appointments): array
    {
        $appointments = collect($appointments);
        $rows = AppointmentPayment::whereIn('appointment_id', $appointments->pluck('id')->all())->get(['appointment_id', 'method', 'amount']);
        $withRows = $rows->pluck('appointment_id')->unique()->flip();
        $legacy = $appointments->filter(fn (Appointment $a) => $a->paid_at && ! $withRows->has($a->id));

        return collect(self::methods())->mapWithKeys(fn ($m) => [$m => round(
            $rows->where('method', $m)->sum('amount') + $legacy->where('payment_method', $m)->sum(fn (Appointment $a) => $a->paidAmount()),
            2,
        )])->all();
    }
}
