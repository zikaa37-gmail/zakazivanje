<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StaffAbsence;
use App\Services\StaffAbsenceService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StaffAbsenceController extends Controller
{
    public function __construct(private StaffAbsenceService $absences) {}

    public function index(Request $request)
    {
        $data = $request->validate([
            'status' => ['nullable', Rule::in([StaffAbsence::STATUS_PENDING, StaffAbsence::STATUS_APPROVED, StaffAbsence::STATUS_REJECTED])],
            'include_past' => ['sometimes', 'boolean'],
        ]);
        $user = $request->user();

        return StaffAbsence::query()
            ->when($data['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when(! ($data['include_past'] ?? false), fn ($q) => $q->where('ends_on', '>=', now()->subDays(7)->toDateString()))
            ->when($user->isServiceWorker(), fn ($q) => $q->where(fn ($w) => $w->where('staff_member_id', $user->staff_member_id)->orWhere('requested_by', $user->id)))
            ->with(['staffMember:id,first_name,last_name,color', 'requester:id,first_name,last_name', 'decider:id,first_name,last_name'])
            ->orderByRaw("case when status = 'pending' then 0 else 1 end")
            ->orderBy('starts_on')
            ->limit(200)
            ->get();
    }

    public function pendingCount()
    {
        return ['count' => StaffAbsence::where('status', StaffAbsence::STATUS_PENDING)->count()];
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'staff_member_id' => ['required', 'integer', Rule::exists('staff_members', 'id')->where('active', true)],
            'starts_on' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'ends_on' => ['required', 'date_format:Y-m-d', 'after_or_equal:starts_on'],
            'type' => ['required', Rule::in(StaffAbsence::TYPES)],
            'note' => ['nullable', 'string', 'max:500'],
        ], [
            'starts_on.after_or_equal' => 'Odsustvo ne može da počne u prošlosti.',
            'ends_on.after_or_equal' => 'Kraj mora biti isti ili posle početka.',
        ]);

        $absence = $this->absences->create($request->user(), $data);

        return response()->json($this->withRelations($absence), 201);
    }

    public function appointments(StaffAbsence $absence)
    {
        return $this->absences->affectedAppointments($absence);
    }

    public function approve(Request $request, StaffAbsence $absence)
    {
        $this->ensurePending($absence);

        return $this->withRelations($this->absences->approve($absence, $request->user()));
    }

    public function reject(Request $request, StaffAbsence $absence)
    {
        $this->ensurePending($absence);

        return $this->withRelations($this->absences->reject($absence, $request->user()));
    }

    public function destroy(Request $request, StaffAbsence $absence)
    {
        $user = $request->user();
        abort_unless($user->isManager() || ($absence->requested_by === $user->id && $absence->status === StaffAbsence::STATUS_PENDING), 403, 'Odsustvo može da ukloni vlasnik ili administrativni radnik.');

        $this->absences->remove($absence);

        return ['message' => 'Odsustvo je uklonjeno.'];
    }

    private function ensurePending(StaffAbsence $absence): void
    {
        if ($absence->status !== StaffAbsence::STATUS_PENDING) {
            throw ValidationException::withMessages(['absence' => ['O ovom odsustvu je već odlučeno.']]);
        }
    }

    private function withRelations(StaffAbsence $absence): StaffAbsence
    {
        return $absence->load(['staffMember:id,first_name,last_name,color', 'requester:id,first_name,last_name', 'decider:id,first_name,last_name']);
    }
}
