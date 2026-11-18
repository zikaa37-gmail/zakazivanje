<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\GiftCard;
use App\Models\User;
use App\Models\WalletEntry;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class WalletService
{
    private const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    public function balance(User $client): float
    {
        return round((float) WalletEntry::where('user_id', $client->id)->sum('amount'), 2);
    }

    public function summary(User $client, int $limit = 30): array
    {
        return [
            'balance' => $this->balance($client),
            'entries' => WalletEntry::where('user_id', $client->id)
                ->with(['author:id,first_name,last_name', 'appointment:id,starts_at', 'giftCard:id,code'])
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
        return GiftCard::create([
            ...$data,
            'code' => $this->newCode(),
            'amount' => round((float) $data['amount'], 2),
            'sold_by' => $by?->id,
        ]);
    }

    public function findGiftCard(string $code): GiftCard
    {
        $card = GiftCard::where('code', GiftCard::normalize($code))->first();
        if (! $card) {
            throw ValidationException::withMessages(['code' => ['Poklon kartica sa tim kodom ne postoji.']]);
        }

        return $card;
    }

    public function redeem(GiftCard $card, User $client, ?User $by): WalletEntry
    {
        return DB::transaction(function () use ($card, $client, $by) {
            $card = GiftCard::whereKey($card->id)->lockForUpdate()->first();
            $message = match ($card->status) {
                GiftCard::STATUS_REDEEMED => 'Ova poklon kartica je već iskorišćena.',
                GiftCard::STATUS_EXPIRED => 'Ova poklon kartica je istekla '.$card->expires_on->format('d.m.Y.').'.',
                GiftCard::STATUS_CANCELLED => 'Ova poklon kartica je poništena.',
                default => null,
            };
            if ($message) {
                throw ValidationException::withMessages(['code' => [$message]]);
            }

            $card->update(['redeemed_by' => $client->id, 'redeemed_at' => now()]);

            return WalletEntry::create([
                'user_id' => $client->id,
                'amount' => $card->amount,
                'kind' => WalletEntry::KIND_GIFT_CARD,
                'gift_card_id' => $card->id,
                'created_by' => $by?->id,
            ]);
        });
    }

    private function newCode(): string
    {
        do {
            $code = collect(range(1, 8))->map(fn () => self::CODE_ALPHABET[random_int(0, strlen(self::CODE_ALPHABET) - 1)])->join('');
        } while (GiftCard::where('code', $code)->exists());

        return $code;
    }
}
