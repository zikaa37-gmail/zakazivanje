<?php

namespace App\Services;

use App\Models\Promotion;
use App\Models\Service;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

class PriceQuoteService
{
    public function quote(Collection $services, CarbonInterface $date, array $completedVisitsByService = [], int $completedVisits = 0, ?string $code = null, ?int $clientId = null): array
    {
        $code = Promotion::normalizeCode($code);
        $codeError = null;
        $promotions = Promotion::active()->with('services')->get()->filter(fn (Promotion $p) => $p->isValidOn($date));
        $coded = $code ? $promotions->first(fn (Promotion $p) => $p->code === $code) : null;
        if ($code && ! $coded) {
            $codeError = 'Kod nije važeći za izabrani datum.';
        } elseif ($coded && ($problem = $coded->codeProblem($clientId))) {
            $codeError = $problem;
            $coded = null;
        }
        $promotions = $promotions->filter(fn (Promotion $p) => $p->code === null || $p->is($coded));

        [$packages, $remaining] = $this->applyPackages($services->keyBy('id'), $promotions->where('type', Promotion::TYPE_PACKAGE));

        $lines = $remaining->values()->map(function (Service $service) use ($promotions, $completedVisitsByService, $completedVisits) {
            [$discount, $promotion] = $this->bestDiscount($service, $promotions, $completedVisitsByService[$service->id] ?? 0, $completedVisits);

            return [
                'service_id' => $service->id,
                'name' => $service->name,
                'price' => $service->price,
                'discount' => $discount,
                'total' => round($service->price - $discount, 2),
                'promotion_id' => $promotion?->id,
                'promotion_name' => $promotion?->name,
            ];
        });

        $subtotal = round($services->sum('price'), 2);
        $total = round($lines->sum('total') + collect($packages)->sum('total'), 2);

        return [
            'packages' => $packages,
            'lines' => $lines->all(),
            'subtotal' => $subtotal,
            'discount' => round($subtotal - $total, 2),
            'total' => $total,
            'code' => $code,
            'code_applied' => $coded !== null && collect($lines)->contains('promotion_id', $coded->id),
            'code_error' => $codeError ?? ($coded && ! collect($lines)->contains('promotion_id', $coded->id) ? 'Kod ne važi za izabrane usluge ili postoji bolja akcija.' : null),
        ];
    }

    private function applyPackages(Collection $remaining, Collection $packages): array
    {
        $applied = [];

        $candidates = $packages
            ->filter(fn (Promotion $p) => $p->services->isNotEmpty() && $p->package_price !== null)
            ->sortByDesc(fn (Promotion $p) => $p->services->sum('price') - $p->package_price);

        foreach ($candidates as $package) {
            $ids = $package->services->pluck('id');

            if ($ids->diff($remaining->keys())->isNotEmpty()) {
                continue;
            }

            $regular = round($remaining->only($ids->all())->sum('price'), 2);

            if ($package->package_price >= $regular) {
                continue;
            }

            $applied[] = [
                'promotion_id' => $package->id,
                'name' => $package->name,
                'service_ids' => $ids->values()->all(),
                'price' => $regular,
                'discount' => round($regular - $package->package_price, 2),
                'total' => $package->package_price,
            ];

            $remaining = $remaining->except($ids->all());
        }

        return [$applied, $remaining];
    }

    private function bestDiscount(Service $service, Collection $promotions, int $completedOfService, int $completedVisits): array
    {
        $best = [0.0, null];

        foreach ($promotions as $promotion) {
            if ($promotion->type === Promotion::TYPE_PACKAGE || ! $promotion->appliesToService($service->id)) {
                continue;
            }

            $discount = match ($promotion->type) {
                Promotion::TYPE_PERCENT => $service->price * ($promotion->discount_percent ?? 0) / 100,
                Promotion::TYPE_AMOUNT => min($promotion->discount_amount ?? 0, $service->price),
                Promotion::TYPE_BUNDLE => $this->isFreeInBundle($promotion, $completedOfService) ? $service->price : 0,
                Promotion::TYPE_LOYALTY => $this->isLoyaltyVisit($promotion, $completedVisits)
                    ? $service->price * ($promotion->discount_percent ?? 100) / 100
                    : 0,
                default => 0,
            };

            if ($discount > $best[0]) {
                $best = [round($discount, 2), $promotion];
            }
        }

        return $best;
    }

    private function isFreeInBundle(Promotion $promotion, int $completedOfService): bool
    {
        $buy = $promotion->buy_quantity ?? 0;
        $free = $promotion->free_quantity ?? 0;

        return $buy > 0 && $free > 0 && $completedOfService % ($buy + $free) >= $buy;
    }

    private function isLoyaltyVisit(Promotion $promotion, int $completedVisits): bool
    {
        $every = $promotion->loyalty_visits ?? 0;

        return $every > 0 && ($completedVisits + 1) % $every === 0;
    }
}
