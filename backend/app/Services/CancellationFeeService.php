<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\AppointmentItem;
use App\Models\BusinessSetting;
use App\Models\CancellationFee;
use App\Models\Service;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class CancellationFeeService
{
    public const DEFAULT_NOTE = 'Kada se termin otkaže u poslednjem trenutku, to vreme ostaje prazno — teško ga je popuniti, a zaposleni koji je došao zbog tebe gubi i vreme i zaradu. Zato se kasno otkazivanje, posle nekoliko opomena, naplaćuje.';

    public function enabled(): bool
    {
        return BusinessSetting::current()->cancellation_fee_enabled;
    }

    public function isLate(Appointment $appointment): bool
    {
        $settings = BusinessSetting::current();

        return $settings->cancellation_fee_enabled
            && $appointment->free_change_reason === null
            && $appointment->client_id !== null
            && in_array($appointment->status, Appointment::BLOCKING_STATUSES, true)
            && now()->gte($settings->cancellationDeadline($appointment->starts_at));
    }

    public function note(): string
    {
        return BusinessSetting::current()->cancellation_fee_note ?: self::DEFAULT_NOTE;
    }

    public function status(User $client, ?Appointment $appointment = null): array
    {
        $settings = BusinessSetting::current();
        $allowed = $this->freeAllowed($appointment);
        $used = $this->usedLate($client);

        return [
            'enabled' => $settings->cancellation_fee_enabled,
            'free_total' => $allowed,
            'used' => $used,
            'free_left' => max(0, $allowed - $used),
            'window_days' => $settings->cancellation_fee_window_days,
            'exempt' => $client->cancellation_discount_type === CancellationFee::DISCOUNT_EXEMPT,
            'open_amount' => (float) CancellationFee::where('client_id', $client->id)->where('status', CancellationFee::STATUS_OPEN)->sum('amount'),
            'note' => $this->note(),
        ];
    }

    public function preview(Appointment $appointment): array
    {
        $client = $appointment->client ?? User::find($appointment->client_id);
        if (! $client || ! $this->isLate($appointment)) {
            return ['late' => false];
        }

        $base = $this->baseAmount($appointment);
        if ($base <= 0) {
            return ['late' => false];
        }

        $status = $this->status($client, $appointment);
        $free = $status['free_left'] > 0 || $status['exempt'];
        $amount = $free ? 0.0 : $this->applyDiscount($client, $base);

        return [
            'late' => true,
            'free' => $free || $amount <= 0,
            'number' => $status['used'] + 1,
            'free_total' => $status['free_total'],
            'free_left_after' => $status['exempt'] ? null : max(0, $status['free_left'] - 1),
            'next_amount' => $free && ! $status['exempt'] ? $this->applyDiscount($client, $base) : null,
            'amount' => $amount,
            'note' => $status['note'],
            'deadline_label' => BusinessSetting::current()->cancellationLabel(),
        ];
    }

    public function record(Appointment $appointment): ?CancellationFee
    {
        $preview = $this->preview($appointment);
        if (! $preview['late']) {
            return null;
        }

        $client = User::find($appointment->client_id);

        return CancellationFee::create([
            'appointment_id' => $appointment->id,
            'client_id' => $appointment->client_id,
            'late_number' => $preview['number'],
            'base_amount' => $this->baseAmount($appointment),
            'amount' => $preview['amount'],
            'status' => $preview['free'] ? CancellationFee::STATUS_FREE : CancellationFee::STATUS_OPEN,
            'reason' => $client?->cancellation_discount_type === CancellationFee::DISCOUNT_EXEMPT ? 'Klijent je oslobođen naknade.' : null,
        ]);
    }

    public function markPaid(CancellationFee $fee, string $method, User $by): CancellationFee
    {
        $this->ensureOpen($fee);
        $fee->update(['status' => CancellationFee::STATUS_PAID, 'paid_at' => now(), 'payment_method' => $method, 'decided_by' => $by->id]);

        return $fee;
    }

    public function waive(CancellationFee $fee, string $reason, User $by): CancellationFee
    {
        $this->ensureOpen($fee);
        $fee->update(['status' => CancellationFee::STATUS_WAIVED, 'reason' => $reason, 'decided_by' => $by->id]);

        return $fee;
    }

    public function adjust(CancellationFee $fee, float $amount, string $reason, User $by): CancellationFee
    {
        $this->ensureOpen($fee);
        if ($amount <= 0) {
            return $this->waive($fee, $reason, $by);
        }
        $fee->update(['amount' => round($amount, 2), 'reason' => $reason, 'decided_by' => $by->id]);

        return $fee;
    }

    public function list(array $filters): Collection
    {
        return CancellationFee::query()
            ->when($filters['client_id'] ?? null, fn ($q, $id) => $q->where('client_id', $id))
            ->when($filters['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
            ->with(['appointment:id,starts_at,staff_member_id,total', 'appointment.items:id,appointment_id,name', 'client:id,first_name,last_name,phone', 'decider:id,first_name,last_name'])
            ->orderByRaw("status = 'open' desc")
            ->orderByDesc('id')
            ->limit(200)
            ->get();
    }

    private function ensureOpen(CancellationFee $fee): void
    {
        if ($fee->status !== CancellationFee::STATUS_OPEN) {
            throw ValidationException::withMessages(['fee' => ['Naknada je već rešena.']]);
        }
    }

    private function usedLate(User $client): int
    {
        return CancellationFee::query()
            ->where('client_id', $client->id)
            ->where('status', '!=', CancellationFee::STATUS_WAIVED)
            ->where('created_at', '>=', now()->subDays(BusinessSetting::current()->cancellation_fee_window_days))
            ->count();
    }

    private function freeAllowed(?Appointment $appointment): int
    {
        $default = BusinessSetting::current()->cancellation_free_late;
        if (! $appointment) {
            return $default;
        }

        return $this->services($appointment)
            ->map(fn (?Service $s) => $s?->cancellation_free_late ?? $default)
            ->push($default)
            ->min();
    }

    private function baseAmount(Appointment $appointment): float
    {
        $settings = BusinessSetting::current();
        $appointment->loadMissing('items');
        $services = Service::whereIn('id', $appointment->items->pluck('service_id')->filter())->get()->keyBy('id');

        return round($appointment->items->sum(function (AppointmentItem $item) use ($services, $settings) {
            $service = $services->get($item->service_id);
            $type = $service?->cancellation_fee_type ?? $settings->cancellation_fee_type;
            $value = $service?->cancellation_fee_type ? (float) $service->cancellation_fee_value : $settings->cancellation_fee_value;
            $price = max(0, (float) $item->price - (float) $item->discount);

            return match ($type) {
                CancellationFee::TYPE_FIXED => $value,
                CancellationFee::TYPE_PERCENT => $price * $value / 100,
                CancellationFee::TYPE_SERVICE_PLUS_FIXED => $price + $value,
                default => 0,
            };
        }), 2);
    }

    private function applyDiscount(User $client, float $amount): float
    {
        $value = (float) $client->cancellation_discount_value;

        return round(max(0, match ($client->cancellation_discount_type) {
            CancellationFee::DISCOUNT_EXEMPT => 0,
            CancellationFee::DISCOUNT_FIXED => $amount - $value,
            CancellationFee::DISCOUNT_PERCENT => $amount * (1 - min(100, $value) / 100),
            default => $amount,
        }), 2);
    }

    private function services(Appointment $appointment): Collection
    {
        $appointment->loadMissing('items');

        return Service::whereIn('id', $appointment->items->pluck('service_id')->filter())->get();
    }
}
