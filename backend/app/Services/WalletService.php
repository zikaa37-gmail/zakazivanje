<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\GiftCard;
use App\Models\User;
use App\Models\WalletEntry;
use App\Notifications\GiftCardReceivedNotification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class WalletService
{
    private const string CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    public function __construct(private readonly Inbox $inbox) {}

    public function balance(User $client): float
    {
        return round((float) WalletEntry::where('user_id', $client->id)->sum('amount'), 2);
    }

    public function summary(User $client, int $limit = 30): array
    {
        return [
            'balance' => $this->balance($client),
            'gift_cards' => $this->giftCardsOf($client),
            'entries' => WalletEntry::where('user_id', $client->id)
                ->with(['author:id,first_name,last_name', 'appointment:id,starts_at'])
                ->orderByDesc('id')
                ->limit($limit)
                ->get(),
        ];
    }

    public function deposit(User $client, float $amount, string $method, ?string $note, ?User $by): WalletEntry
    {
        return WalletEntry::create([
            'user_id' => $client->id,
            'amount' => round($amount, 2),
            'kind' => WalletEntry::KIND_DEPOSIT,
            'payment_method' => $method,
            'note' => $note,
            'created_by' => $by?->id,
        ]);
    }

    public function adjust(User $client, float $amount, string $note, ?User $by): WalletEntry
    {
        if ($this->balance($client) + $amount < 0) {
            throw ValidationException::withMessages(['amount' => ['Stanje ne može da padne ispod nule.']]);
        }

        return WalletEntry::create([
            'user_id' => $client->id,
            'amount' => round($amount, 2),
            'kind' => WalletEntry::KIND_ADJUSTMENT,
            'note' => $note,
            'created_by' => $by?->id,
        ]);
    }

    public function charge(User $client, float $amount, Appointment $appointment, ?User $by): WalletEntry
    {
        return DB::transaction(function () use ($client, $amount, $appointment, $by) {
            User::whereKey($client->id)->lockForUpdate()->first();
            $balance = $this->balance($client);
            if ($balance + 0.001 < $amount) {
                throw ValidationException::withMessages(['payment_method' => ['Na stanju klijenta je '.number_format($balance, 0, ',', '.').' din. — nije dovoljno.']]);
            }

            return WalletEntry::create([
                'user_id' => $client->id,
                'amount' => -round($amount, 2),
                'kind' => WalletEntry::KIND_PAYMENT,
                'appointment_id' => $appointment->id,
                'created_by' => $by?->id,
            ]);
        });
    }

    public function refund(User $client, float $amount, Appointment $appointment, ?User $by): WalletEntry
    {
        return WalletEntry::create([
            'user_id' => $client->id,
            'amount' => round($amount, 2),
            'kind' => WalletEntry::KIND_REFUND,
            'appointment_id' => $appointment->id,
            'created_by' => $by?->id,
        ]);
    }

    public function sellGiftCard(array $data, ?User $by): GiftCard
    {
        $card = GiftCard::create([
            ...$data,
            'code' => $this->newCode(),
            'amount' => round((float) $data['amount'], 2),
            'balance' => round((float) $data['amount'], 2),
            'sold_by' => $by?->id,
        ]);
        if ($card->owner) {
            $this->inbox->deliver([$card->owner], new GiftCardReceivedNotification($card));
        }

        return $card;
    }

    public function findGiftCard(string $code): GiftCard
    {
        $card = GiftCard::where('code', GiftCard::normalize($code))->first();
        if (! $card) {
            throw ValidationException::withMessages(['code' => ['Poklon kartica sa tim kodom ne postoji.']]);
        }

        return $card;
    }

    public function claim(GiftCard $card, User $client): GiftCard
    {
        if ($card->owner_id && $card->owner_id !== $client->id) {
            throw ValidationException::withMessages(['code' => ['Ova poklon kartica je već na drugom nalogu.']]);
        }
        if ($card->status === GiftCard::STATUS_CANCELLED) {
            throw ValidationException::withMessages(['code' => ['Ova poklon kartica je poništena.']]);
        }
        $card->update(['owner_id' => $client->id]);

        return $card;
    }

    public function giftCardsOf(User $client): Collection
    {
        return GiftCard::where('owner_id', $client->id)
            ->whereNull('cancelled_at')
            ->orderByDesc('balance')
            ->orderByDesc('id')
            ->get(['id', 'code', 'kind', 'amount', 'balance', 'buyer_name', 'note', 'expires_on', 'cancelled_at', 'created_at']);
    }

    private function newCode(): string
    {
        do {
            $code = collect(range(1, 8))->map(fn () => self::CODE_ALPHABET[random_int(0, strlen(self::CODE_ALPHABET) - 1)])->join('');
        } while (GiftCard::where('code', $code)->exists());

        return $code;
    }
}
