<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\User;
use App\Services\WalletService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

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

    public function redeem(Request $request, User $client)
    {
        abort_unless($client->role === UserRole::Client, 404);
        $data = $request->validate(['code' => ['required', 'string', 'max:30']]);

        $this->wallet->redeem($this->wallet->findGiftCard($data['code']), $client, $request->user());

        return $this->wallet->summary($client);
    }

    public function mine(Request $request)
    {
        return $this->wallet->summary($request->user());
    }

    public function redeemMine(Request $request)
    {
        $data = $request->validate(['code' => ['required', 'string', 'max:30']]);

        $this->wallet->redeem($this->wallet->findGiftCard($data['code']), $request->user(), $request->user());

        return $this->wallet->summary($request->user());
    }
}
