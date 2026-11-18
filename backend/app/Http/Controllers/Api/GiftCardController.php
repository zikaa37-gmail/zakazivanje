<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\GiftCard;
use App\Services\WalletService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class GiftCardController extends Controller
{
    public function __construct(private WalletService $wallet) {}

    public function index(Request $request)
    {
        $data = $request->validate([
            'status' => ['nullable', Rule::in([GiftCard::STATUS_ACTIVE, GiftCard::STATUS_REDEEMED, GiftCard::STATUS_EXPIRED, GiftCard::STATUS_CANCELLED])],
            'search' => ['nullable', 'string', 'max:100'],
        ]);
        $search = trim($data['search'] ?? '');

        return GiftCard::query()
            ->with(['seller:id,first_name,last_name', 'redeemer:id,first_name,last_name,nickname'])
            ->when($search !== '', fn ($q) => $q->where(fn ($w) => $w
                ->where('code', 'like', '%'.GiftCard::normalize($search).'%')
                ->orWhere('buyer_name', 'like', "%{$search}%")
                ->orWhere('recipient_name', 'like', "%{$search}%")))
            ->orderByDesc('id')
            ->limit(300)
            ->get()
            ->when($data['status'] ?? null, fn ($cards, $status) => $cards->where('status', $status)->values());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:100', 'max:10000000'],
            'payment_method' => ['required', Rule::in(Appointment::PAYMENT_METHODS)],
            'buyer_name' => ['nullable', 'string', 'max:150'],
            'recipient_name' => ['nullable', 'string', 'max:150'],
            'note' => ['nullable', 'string', 'max:500'],
            'expires_on' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:today'],
        ], ['payment_method.required' => 'Izaberi kako je plaćeno.']);

        return response()->json($this->wallet->sellGiftCard($data, $request->user())->load('seller:id,first_name,last_name'), 201);
    }

    public function check(Request $request)
    {
        $data = $request->validate(['code' => ['required', 'string', 'max:30']]);

        return $this->wallet->findGiftCard($data['code']);
    }

    public function cancel(GiftCard $giftCard)
    {
        if ($giftCard->redeemed_at) {
            throw ValidationException::withMessages(['code' => ['Iskorišćena kartica ne može da se poništi — iznos je već na stanju klijenta.']]);
        }
        $giftCard->update(['cancelled_at' => now()]);

        return $giftCard;
    }
}
