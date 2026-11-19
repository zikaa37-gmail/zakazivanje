<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\AppointmentRecurrence;
use App\Models\GiftCard;
use App\Models\User;
use App\Models\WaitlistEntry;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ClientDeactivationService
{
    public function __construct(
        private readonly BookingService $bookings,
        private readonly AppointmentNotifier $notifier,
        private readonly WaitlistService $waitlist,
        private readonly WalletService $wallet,
    ) {}

    public function futureAppointments(User $client): Builder
    {
        return Appointment::query()
            ->where('client_id', $client->id)
            ->blocking()
            ->where('starts_at', '>', now());
    }

    public function impact(User $client): array
    {
        return [
            'future' => $this->futureAppointments($client)->count(),
            'balance' => $this->wallet->balance($client),
            'gift_cards' => GiftCard::where('owner_id', $client->id)->whereNull('cancelled_at')->where('balance', '>', 0)->count(),
        ];
    }

    public function setActive(User $client, bool $active, bool $cancelFuture): int
    {
        if ($active) {
            $client->update(['active' => true]);

            return 0;
        }

        $future = $this->futureAppointments($client)->count();
        if ($future > 0 && ! $cancelFuture) {
            throw ValidationException::withMessages(['active' => ["Klijent ima zakazanih termina: {$future}. Otkaži ih pre deaktivacije."]]);
        }

        return DB::transaction(function () use ($client) {
            $cancelled = $this->cancelFuture($client);
            AppointmentRecurrence::where('client_id', $client->id)->where('active', true)->update(['active' => false]);
            WaitlistEntry::where('client_id', $client->id)->whereNull('fulfilled_at')->delete();
            $client->update(['active' => false]);

            return $cancelled;
        });
    }

    private function cancelFuture(User $client): int
    {
        $appointments = $this->futureAppointments($client)->with(['client', 'items', 'staffMember'])->orderBy('starts_at')->get();
        foreach ($appointments as $appointment) {
            $this->bookings->cancel($appointment, 'admin');
            $this->notifier->changedSilently($appointment);
            $this->waitlist->slotFreed($appointment);
        }

        return $appointments->count();
    }
}
