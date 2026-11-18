<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
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
            'status' => ['nullable', Rule::in(GiftCard::STATUSES)],
            'search' => ['nullable', 'string', 'max:100'],
        ]);
        $search = trim($data['search'] ?? '');

        return GiftCard::query()
            ->with(['seller:id,first_name,last_name', 'owner:id,first_name,last_name,nickname'])
            ->when($search !== '', fn ($q) => $q->where(fn ($w) => $w
                ->where('code', 'like', '%'.GiftCard::normalize($search).'%')
                ->orWhere('card_number', 'like', "%{$search}%")
                ->orWhere('buyer_name', 'like', "%{$search}%")
                ->orWhere('recipient_name', 'like', "%{$search}%")
                ->orWhereHas('owner', fn ($o) => $o->where('first_name', 'like', "%{$search}%")->orWhere('last_name', 'like', "%{$search}%"))))
            ->orderByDesc('id')
            ->limit(300)
            ->get()
            ->when($data['status'] ?? null, fn ($cards, $status) => $cards->where('status', $status)->values());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'kind' => ['required', Rule::in([GiftCard::KIND_DIGITAL, GiftCard::KIND_PHYSICAL])],
            'amount' => ['required', 'numeric', 'min:100', 'max:10000000'],
            'payment_method' => ['required', Rule::in(Appointment::PAYMENT_METHODS)],
            'owner_id' => ['nullable', 'required_if:kind,digital', 'integer', Rule::exists('users', 'id')->where('role', UserRole::Client->value)],
            'card_number' => ['nullable', 'string', 'max:30'],
            'buyer_name' => ['nullable', 'string', 'max:150'],
            'recipient_name' => ['nullable', 'string', 'max:150'],
            'note' => ['nullable', 'string', 'max:500'],
            'expires_on' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:today'],
        ], [
            'payment_method.required' => 'Izaberi kako je plaćeno.',
            'owner_id.required_if' => 'Izaberi klijenta kome se poklanja.',
        ]);

        return response()->json($this->wallet->sellGiftCard($data, $request->user())->load(['seller:id,first_name,last_name', 'owner:id,first_name,last_name,nickname']), 201);
    }

    public function check(Request $request)
    {
        $data = $request->validate(['code' => ['required', 'string', 'max:30']]);
        $card = $this->wallet->findGiftCard($data['code'])->load(['seller:id,first_name,last_name', 'owner:id,first_name,last_name,nickname']);

        return [
            ...$card->toArray(),
            'uses' => $card->payments()->with('appointment:id,starts_at')->orderBy('id')->get(['id', 'appointment_id', 'amount', 'created_at']),
        ];
    }

    public function cancel(GiftCard $giftCard)
    {
        if ($giftCard->balance < $giftCard->amount) {
            throw ValidationException::withMessages(['code' => ['Kartica je već korišćena i ne može da se poništi.']]);
        }
        $giftCard->update(['cancelled_at' => now()]);

        return $giftCard;
    }
}
