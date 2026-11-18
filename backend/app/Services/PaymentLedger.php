<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\AppointmentPayment;
use App\Models\GiftCard;
use App\Models\User;
use App\Notifications\GiftCardUsedNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentLedger
{
    public const WALLET = 'wallet';

    public const GIFT_CARD = 'gift_card';

    private const PREPAID = [self::WALLET, self::GIFT_CARD];

    public function __construct(private WalletService $wallet, private Inbox $inbox) {}

    public static function methods(): array
    {
        return [...Appointment::PAYMENT_METHODS, self::WALLET, self::GIFT_CARD];
    }

    public function paidSum(Appointment $appointment): float
    {
        return round((float) AppointmentPayment::where('appointment_id', $appointment->id)->sum('amount'), 2);
    }

    public function settle(Appointment $appointment, float $target, ?string $method, ?User $by, ?GiftCard $card = null): float
    {
        return DB::transaction(function () use ($appointment, $target, $method, $by, $card) {
            $delta = round($target - $this->paidSum($appointment), 2);
            $fromCard = 0.0;
            if ($delta > 0 && $card) {
                $fromCard = $this->useGiftCard($appointment, $card, $delta, $by);
                $delta = round($delta - $fromCard, 2);
            }
            if ($delta > 0) {
                if (! $method || $method === self::GIFT_CARD) {
                    throw ValidationException::withMessages(['payment_method' => ['Izaberi kako je plaćen ostatak od '.number_format($delta, 0, ',', '.').' din.']]);
                }
                $this->add($appointment, $delta, $method, $by);
            } elseif ($delta < 0) {
                $this->reverse($appointment, -$delta, $by);
            }

            return $fromCard;
        });
    }

    public function useGiftCard(Appointment $appointment, GiftCard $card, float $max, ?User $by): float
    {
        $card = GiftCard::whereKey($card->id)->lockForUpdate()->first();
        $message = match ($card->status) {
            GiftCard::STATUS_USED => 'Na poklon kartici '.$card->formattedCode().' nema više sredstava.',
            GiftCard::STATUS_EXPIRED => 'Poklon kartica '.$card->formattedCode().' je istekla '.$card->expires_on->format('d.m.Y.').'.',
            GiftCard::STATUS_CANCELLED => 'Poklon kartica '.$card->formattedCode().' je poništena.',
            default => null,
        };
        if ($message) {
            throw ValidationException::withMessages(['gift_card_code' => [$message]]);
        }

        $take = round(min($max, $card->balance), 2);
        $card->update(['balance' => round($card->balance - $take, 2)]);
        AppointmentPayment::create(['appointment_id' => $appointment->id, 'amount' => $take, 'method' => self::GIFT_CARD, 'gift_card_id' => $card->id, 'created_by' => $by?->id]);

        if ($card->owner && $card->owner_id !== $by?->id) {
            $this->inbox->deliver([$card->owner], new GiftCardUsedNotification($card, $take));
        }

        return $take;
    }

    public function payFromWallet(Appointment $appointment, float $max, ?User $by): float
    {
        return DB::transaction(function () use ($appointment, $max, $by) {
            $take = round(min($max, $this->wallet->balance($appointment->client)), 2);
            if ($take <= 0) {
                throw ValidationException::withMessages(['source' => ['Na stanju nema sredstava.']]);
            }
            $this->add($appointment, $take, self::WALLET, $by);

            return $take;
        });
    }

    public function refundPrepaid(Appointment $appointment, ?User $by): float
    {
        return DB::transaction(function () use ($appointment, $by) {
            $refunded = 0.0;
            $rows = AppointmentPayment::where('appointment_id', $appointment->id)->whereIn('method', self::PREPAID)->get();
            foreach ($rows->groupBy(fn ($r) => $r->method.':'.$r->gift_card_id) as $group) {
                $net = round($group->sum('amount'), 2);
                if ($net > 0) {
                    $this->undo($appointment, $group->first()->method, $group->first()->gift_card_id, $net, $by);
                    $refunded += $net;
                }
            }
            if ($refunded > 0) {
                $paid = $this->paidSum($appointment);
                $appointment->update(['paid_amount' => $paid > 0 ? $paid : null, 'paid_at' => $paid > 0 ? $appointment->paid_at : null, 'payment_method' => $paid > 0 ? $appointment->payment_method : null]);
            }

            return $refunded;
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
        $rows = AppointmentPayment::where('appointment_id', $appointment->id)->orderByDesc('id')->get();
        foreach ($rows->groupBy(fn ($r) => $r->method.':'.$r->gift_card_id) as $group) {
            if ($left <= 0) {
                break;
            }
            $take = round(min($left, $group->sum('amount')), 2);
            if ($take <= 0) {
                continue;
            }
            $this->undo($appointment, $group->first()->method, $group->first()->gift_card_id, $take, $by);
            $left = round($left - $take, 2);
        }
    }

    private function undo(Appointment $appointment, string $method, ?int $giftCardId, float $amount, ?User $by): void
    {
        AppointmentPayment::create(['appointment_id' => $appointment->id, 'amount' => -$amount, 'method' => $method, 'gift_card_id' => $giftCardId, 'created_by' => $by?->id]);
        if ($method === self::WALLET && $appointment->client) {
            $this->wallet->refund($appointment->client, $amount, $appointment, $by);
        }
        if ($method === self::GIFT_CARD && $giftCardId) {
            GiftCard::whereKey($giftCardId)->lockForUpdate()->first()?->increment('balance', $amount);
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
