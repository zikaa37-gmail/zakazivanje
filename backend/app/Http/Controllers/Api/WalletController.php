<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\User;
use App\Services\PaymentLedger;
use App\Services\WalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class WalletController extends Controller
{
    public function __construct(private WalletService $wallet) {}

    public function show(User $client)
    {
        abort_unless($client->role === UserRole::Client, 404);

        return $this->wallet->summary($client);
    }

    public function deposit(Request $request, User $client)
    {
        abort_unless($client->role === UserRole::Client, 404);
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:1', 'max:10000000'],
            'payment_method' => ['required', Rule::in(Appointment::PAYMENT_METHODS)],
            'note' => ['nullable', 'string', 'max:500'],
        ], ['payment_method.required' => 'Izaberi kako je uplaćeno.']);

        $this->wallet->deposit($client, (float) $data['amount'], $data['payment_method'], $data['note'] ?? null, $request->user());

        return $this->wallet->summary($client);
    }

    public function adjust(Request $request, User $client)
    {
        abort_unless($client->role === UserRole::Client, 404);
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'not_in:0', 'between:-10000000,10000000'],
            'note' => ['required', 'string', 'max:500'],
        ], ['note.required' => 'Upiši razlog ispravke.']);

        $this->wallet->adjust($client, (float) $data['amount'], $data['note'], $request->user());

        return $this->wallet->summary($client);
    }

    public function claim(Request $request, User $client)
    {
        abort_unless($client->role === UserRole::Client, 404);
        $data = $request->validate(['code' => ['required', 'string', 'max:30']]);

        $this->wallet->claim($this->wallet->findGiftCard($data['code']), $client);

        return $this->wallet->summary($client);
    }

    public function mine(Request $request)
    {
        return $this->wallet->summary($request->user());
    }

    public function claimMine(Request $request)
    {
        $data = $request->validate(['code' => ['required', 'string', 'max:30']]);

        $this->wallet->claim($this->wallet->findGiftCard($data['code']), $request->user());

        return $this->wallet->summary($request->user());
    }

    public function payMine(Request $request, Appointment $appointment, PaymentLedger $ledger)
    {
        $client = $request->user();
        abort_unless($appointment->client_id === $client->id, 404);
        $data = $request->validate([
            'source' => ['required', Rule::in([PaymentLedger::WALLET, PaymentLedger::GIFT_CARD])],
            'code' => ['nullable', 'required_if:source,gift_card', 'string', 'max:30'],
        ], ['code.required_if' => 'Upiši kod poklon kartice.']);

        $left = $appointment->amountLeft();
        if ($left <= 0 || ! in_array($appointment->status, [...Appointment::BLOCKING_STATUSES, Appointment::STATUS_COMPLETED], true)) {
            throw ValidationException::withMessages(['source' => ['Za ovaj termin nema ništa za plaćanje.']]);
        }

        $card = $data['source'] === PaymentLedger::GIFT_CARD ? $this->wallet->findGiftCard($data['code']) : null;
        if ($card && $card->owner_id && $card->owner_id !== $client->id) {
            throw ValidationException::withMessages(['code' => ['Ova poklon kartica je na drugom nalogu.']]);
        }

        $paid = DB::transaction(function () use ($appointment, $ledger, $card, $left, $client) {
            $appointment->loadMissing('client');
            $take = $card ? $ledger->useGiftCard($appointment, $card, $left, $client) : $ledger->payFromWallet($appointment, $left, $client);
            $total = $ledger->paidSum($appointment);
            $appointment->update([
                'paid_amount' => $total,
                'paid_at' => $appointment->paid_at ?? now(),
                'payment_method' => $card ? PaymentLedger::GIFT_CARD : PaymentLedger::WALLET,
            ]);

            return $take;
        });

        $card?->refresh();
        $message = 'Plaćeno '.number_format($paid, 0, ',', '.').' din.';
        if ($card) {
            $message .= ' Na kartici je ostalo '.number_format($card->balance, 0, ',', '.').' din.';
        }
        $rest = $appointment->refresh()->amountLeft();
        if ($rest > 0) {
            $message .= ' Ostatak od '.number_format($rest, 0, ',', '.').' din. plaćaš u salonu.';
        }

        return ['message' => $message, 'wallet' => $this->wallet->summary($client)];
    }
}
