<?php

namespace App\Http\Controllers\Api;

use App\Events\ClientActivity;
use App\Http\Controllers\Controller;
use App\Models\BusinessSetting;
use App\Models\WaitlistEntry;
use App\Services\AvailabilityService;
use App\Services\BookingService;
use App\Services\ClientDisciplineService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class WaitlistController extends Controller
{
    public function __construct(private AvailabilityService $availability, private BookingService $bookings) {}

    public function mine(Request $request)
    {
        return WaitlistEntry::query()
            ->active()
            ->where('client_id', $request->user()->id)
            ->with('staffMember:id,first_name,last_name')
            ->orderBy('date')
            ->get()
            ->map(fn (WaitlistEntry $entry) => $this->present($entry));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'service_ids' => ['required', 'array', 'min:1'],
            'service_ids.*' => ['integer', 'distinct', 'exists:services,id'],
            'staff_member_id' => ['nullable', 'integer', 'exists:staff_members,id'],
            'date' => ['required', 'date_format:Y-m-d'],
            'part' => ['sometimes', Rule::in(WaitlistEntry::PARTS)],
        ]);

        abort_unless(BusinessSetting::current()->waitlist_enabled, 422, 'Lista čekanja nije uključena.');
        app(ClientDisciplineService::class)->ensureNotSuspended($request->user());

        $services = $this->availability->servicesInOrder($data['service_ids']);
        $date = CarbonImmutable::parse($data['date']);
        if (! $this->availability->isOpenDay($services, $data['staff_member_id'] ?? null, $date)) {
            throw ValidationException::withMessages(['date' => ['Za taj dan ne može lista čekanja — salon ili izabrani frizer tada ne radi.']]);
        }
        $this->bookings->ensureAudience($request->user(), $services);

        $entry = WaitlistEntry::query()->active()->where('client_id', $request->user()->id)->whereDate('date', $date->toDateString())->first()
            ?? new WaitlistEntry(['client_id' => $request->user()->id, 'date' => $date->toDateString()]);
        $entry->fill([
            'staff_member_id' => $data['staff_member_id'] ?? null,
            'part' => $data['part'] ?? WaitlistEntry::PART_ANY,
            'service_ids' => $services->pluck('id')->all(),
            'notified_at' => null,
        ])->save();
        ClientActivity::dispatch($request->user(), ClientActivity::WAITLIST_JOINED, ['date' => $date->toDateString(), 'staff_member_id' => $entry->staff_member_id, 'part' => $entry->part]);

        return response()->json($this->present($entry->load('staffMember:id,first_name,last_name')), 201);
    }

    public function destroy(Request $request, WaitlistEntry $entry)
    {
        abort_unless($entry->client_id === $request->user()->id, 404);
        $entry->delete();

        return response()->json(['message' => 'Uklonjeno sa liste čekanja.']);
    }

    public function index()
    {
        return WaitlistEntry::query()
            ->active()
            ->with(['client:id,first_name,last_name,phone,email', 'staffMember:id,first_name,last_name'])
            ->orderBy('date')
            ->orderBy('created_at')
            ->limit(200)
            ->get()
            ->map(fn (WaitlistEntry $entry) => [...$this->present($entry), 'client' => $entry->client]);
    }

    public function adminDestroy(WaitlistEntry $entry)
    {
        $entry->delete();

        return response()->json(['message' => 'Uklonjeno sa liste čekanja.']);
    }

    private function present(WaitlistEntry $entry): array
    {
        return [
            'id' => $entry->id,
            'date' => CarbonImmutable::parse($entry->date)->toDateString(),
            'part' => $entry->part,
            'part_label' => $entry->partLabel(),
            'service_ids' => $entry->service_ids,
            'services' => $this->availability->servicesInOrder($entry->service_ids)->pluck('name')->join(' + '),
            'staff_member' => $entry->staffMember?->only(['id', 'first_name', 'last_name']),
            'notified_at' => $entry->notified_at?->toIso8601String(),
            'created_at' => $entry->created_at?->toIso8601String(),
        ];
    }
}
