<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppointmentItem;
use App\Models\BusinessSetting;
use App\Models\Service;
use App\Services\PriceQuoteService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ServiceController extends Controller
{
    public function index()
    {
        return $this->ordered(Service::query()
            ->with('staffMembers:id,first_name,last_name')
            ->get());
    }

    public function publicIndex()
    {
        return $this->ordered(Service::query()
            ->offeredOnline()
            ->with(['staffMembers' => fn ($q) => $q->where('active', true)->select('staff_members.id', 'first_name', 'last_name', 'title')])
            ->get(['id', 'name', 'description', 'service_category_id', 'audience', 'duration_minutes', 'price', 'paused_until']))
            ->each->setHidden(['serviceCategory', 'service_category_id']);
    }

    private function ordered(Collection $services): Collection
    {
        return $services->sortBy([
            fn (Service $a, Service $b) => ($a->serviceCategory?->sort_order ?? PHP_INT_MAX) <=> ($b->serviceCategory?->sort_order ?? PHP_INT_MAX),
            fn (Service $a, Service $b) => $a->sort_order <=> $b->sort_order,
            fn (Service $a, Service $b) => strnatcasecmp($a->name, $b->name),
        ])->values();
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);

        $service = DB::transaction(fn () => $this->persist(new Service, $data));

        return response()->json($service, 201);
    }

    public function update(Request $request, Service $service)
    {
        $data = $this->validated($request);

        return DB::transaction(fn () => $this->persist($service, $data));
    }

    public function destroy(Service $service)
    {
        if (AppointmentItem::where('service_id', $service->id)->exists()) {
            throw ValidationException::withMessages(['service' => ['Usluga ima termine u istoriji — onemogući je umesto brisanja, da istorija i izveštaji ostanu tačni.']]);
        }

        $service->delete();

        return response()->json(['message' => 'Usluga je obrisana.']);
    }

    public function quote(Request $request, PriceQuoteService $quotes)
    {
        $data = $request->validate([
            'service_ids' => ['required', 'array', 'min:1'],
            'service_ids.*' => ['integer', 'distinct', 'exists:services,id'],
            'date' => ['nullable', 'date'],
            'completed_visits' => ['nullable', 'integer', 'min:0'],
            'completed_visits_by_service' => ['nullable', 'array'],
            'completed_visits_by_service.*' => ['integer', 'min:0'],
        ]);

        return $quotes->quote(
            Service::whereIn('id', $data['service_ids'])->get(),
            isset($data['date']) ? Carbon::parse($data['date']) : now(),
            $data['completed_visits_by_service'] ?? [],
            $data['completed_visits'] ?? 0,
        );
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'description' => ['nullable', 'string', 'max:2000'],
            'service_category_id' => ['nullable', 'integer', 'exists:service_categories,id'],
            'audience' => ['sometimes', Rule::in(Service::AUDIENCES)],
            'booking_confirmation' => ['nullable', Rule::in(BusinessSetting::CONFIRMATION_MODES)],
            'duration_minutes' => ['required', 'integer', 'min:5', 'max:720'],
            'price' => ['required', 'numeric', 'min:0', 'max:10000000'],
            'active' => ['boolean'],
            'paused_until' => ['nullable', 'date_format:Y-m-d'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'staff_member_ids' => ['array'],
            'staff_member_ids.*' => ['integer', 'exists:staff_members,id'],
        ]);
    }

    private function persist(Service $service, array $data): Service
    {
        $service->fill(collect($data)->except('staff_member_ids')->all())->save();

        if (array_key_exists('staff_member_ids', $data)) {
            $service->staffMembers()->sync($data['staff_member_ids']);
        }

        return $service->load('staffMembers:id,first_name,last_name');
    }
}
