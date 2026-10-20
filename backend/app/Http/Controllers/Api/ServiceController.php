<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Service;
use App\Services\PriceQuoteService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ServiceController extends Controller
{
    public function index()
    {
        return Service::query()
            ->with('staffMembers:id,first_name,last_name')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();
    }

    public function publicIndex()
    {
        return Service::query()
            ->where('active', true)
            ->with(['staffMembers' => fn ($q) => $q->where('active', true)->select('staff_members.id', 'first_name', 'last_name', 'title')])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'description', 'category', 'duration_minutes', 'price']);
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
            'category' => ['nullable', 'string', 'max:100'],
            'duration_minutes' => ['required', 'integer', 'min:5', 'max:720'],
            'price' => ['required', 'numeric', 'min:0', 'max:10000000'],
            'active' => ['boolean'],
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
