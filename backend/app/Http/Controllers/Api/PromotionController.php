<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Promotion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PromotionController extends Controller
{
    public function index()
    {
        return Promotion::query()
            ->with('services:id,name,price')
            ->orderByDesc('active')
            ->orderBy('name')
            ->get()
            ->each(fn (Promotion $p) => $p->setAttribute('uses', $p->code ? $p->uses() : null));
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);

        $promotion = DB::transaction(fn () => $this->persist(new Promotion, $data));

        return response()->json($promotion, 201);
    }

    public function update(Request $request, Promotion $promotion)
    {
        $data = $this->validated($request);

        return DB::transaction(fn () => $this->persist($promotion, $data));
    }

    public function destroy(Promotion $promotion)
    {
        $promotion->delete();

        return response()->json(['message' => 'Akcija je obrisana.']);
    }

    private function validated(Request $request): array
    {
        $request->merge(['code' => Promotion::normalizeCode($request->input('code'))]);
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'code' => ['nullable', 'string', 'max:40', 'regex:/^[A-Za-z0-9_-]+$/', Rule::unique('promotions', 'code')->ignore($request->route('promotion'))],
            'max_uses' => ['nullable', 'integer', 'min:1', 'max:100000'],
            'once_per_client' => ['boolean'],
            'type' => ['required', Rule::in(Promotion::TYPES)],
            'description' => ['nullable', 'string', 'max:2000'],
            'discount_percent' => ['nullable', 'numeric', 'gt:0', 'max:100'],
            'discount_amount' => ['nullable', 'numeric', 'gt:0'],
            'package_price' => ['nullable', 'numeric', 'min:0'],
            'buy_quantity' => ['nullable', 'integer', 'min:1', 'max:20'],
            'free_quantity' => ['nullable', 'integer', 'min:1', 'max:20'],
            'loyalty_visits' => ['nullable', 'integer', 'min:2', 'max:100'],
            'starts_on' => ['nullable', 'date'],
            'ends_on' => ['nullable', 'date', 'after_or_equal:starts_on'],
            'weekdays' => ['nullable', 'array'],
            'weekdays.*' => ['integer', 'between:1,7', 'distinct'],
            'active' => ['boolean'],
            'service_ids' => ['array'],
            'service_ids.*' => ['integer', 'distinct', 'exists:services,id'],
        ], [
            'ends_on.after_or_equal' => 'Kraj akcije ne može biti pre početka.',
            'code.regex' => 'Kod sme da ima samo slova, brojeve, - i _ (bez razmaka).',
            'code.unique' => 'Već postoji akcija sa ovim kodom.',
        ]);

        $required = match ($data['type']) {
            Promotion::TYPE_PERCENT => ['discount_percent' => 'Unesi procenat popusta.'],
            Promotion::TYPE_AMOUNT => ['discount_amount' => 'Unesi iznos popusta.'],
            Promotion::TYPE_BUNDLE => ['buy_quantity' => 'Unesi koliko se plaća (npr. 2 kod 2+1).', 'free_quantity' => 'Unesi koliko je gratis (npr. 1 kod 2+1).'],
            Promotion::TYPE_PACKAGE => ['package_price' => 'Unesi cenu paketa.'],
            Promotion::TYPE_LOYALTY => ['loyalty_visits' => 'Unesi na koju posetu važi nagrada.', 'discount_percent' => 'Unesi procenat popusta (100 = gratis).'],
        };

        $missing = collect($required)->filter(fn ($message, $field) => ($data[$field] ?? null) === null);

        if ($missing->isNotEmpty()) {
            throw ValidationException::withMessages($missing->map(fn ($m) => [$m])->all());
        }

        if ($data['type'] === Promotion::TYPE_PACKAGE && count($data['service_ids'] ?? []) < 2) {
            throw ValidationException::withMessages(['service_ids' => ['Paket mora imati bar dve usluge.']]);
        }

        $fields = ['discount_percent', 'discount_amount', 'package_price', 'buy_quantity', 'free_quantity', 'loyalty_visits'];
        foreach (array_diff($fields, array_keys($required)) as $unused) {
            $data[$unused] = null;
        }

        return $data;
    }

    private function persist(Promotion $promotion, array $data): Promotion
    {
        $promotion->fill(collect($data)->except('service_ids')->all())->save();
        $promotion->services()->sync($data['service_ids'] ?? []);

        return $promotion->load('services:id,name,price');
    }
}
