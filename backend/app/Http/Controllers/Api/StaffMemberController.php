<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\BusinessSetting;
use App\Models\OpeningHour;
use App\Models\StaffMember;
use App\Models\User;
use App\Services\StaffAbsenceService;
use App\Services\StaffAccountService;
use App\Services\StaffDeactivationService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StaffMemberController extends Controller
{
    public function __construct(private StaffAccountService $accounts, private StaffDeactivationService $deactivation) {}

    public function futureAppointments(StaffMember $staffMember, StaffAbsenceService $absences)
    {
        return $absences->appointmentsBetween($staffMember->id, CarbonImmutable::now(), CarbonImmutable::now()->addYears(2));
    }

    public function index(Request $request)
    {
        $data = $request->validate(['include_inactive' => ['sometimes', 'boolean']]);

        return StaffMember::query()
            ->with(['workingHours', 'services:id,name', 'account:id,staff_member_id,role,active,ui_mode'])
            ->when(! ($data['include_inactive'] ?? true), fn ($q) => $q->where('active', true))
            ->orderBy('sort_order')
            ->orderBy('first_name')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);

        $staff = DB::transaction(fn () => $this->persist(new StaffMember, $data, $request->user()));

        return response()->json($staff, 201);
    }

    public function update(Request $request, StaffMember $staffMember)
    {
        $data = $this->validated($request);

        if ($staffMember->active && array_key_exists('active', $data) && ! $data['active']) {
            $future = $this->deactivation->futureAppointments($staffMember)->count();
            if ($future > 0) {
                throw ValidationException::withMessages(['active' => ["{$staffMember->first_name} ima budućih termina: {$future}. Deaktiviraj iz liste zaposlenih (meni ⋮ → Deaktiviraj), gde možeš da ih prebaciš ili otkažeš."]]);
            }
            $this->deactivation->stopRecurrences($staffMember);
        }

        return DB::transaction(fn () => $this->persist($staffMember, $data, $request->user()));
    }

    public function setActive(Request $request, StaffMember $staffMember)
    {
        $data = $request->validate(['active' => ['required', 'boolean'], 'cancel_future' => ['sometimes', 'boolean']]);

        $cancelled = 0;
        if (! $data['active']) {
            $future = $this->deactivation->futureAppointments($staffMember)->count();
            if ($future > 0 && ! ($data['cancel_future'] ?? false)) {
                throw ValidationException::withMessages(['active' => ["{$staffMember->first_name} ima budućih termina: {$future}. Prebaci ih kolegi ili ih otkaži pre deaktivacije."]]);
            }
            $cancelled = $future > 0 ? $this->deactivation->cancelFuture($staffMember) : 0;
            $this->deactivation->stopRecurrences($staffMember);
        }

        DB::transaction(function () use ($staffMember, $data) {
            $staffMember->update(['active' => $data['active']]);
            $this->accounts->sync($staffMember);
        });

        return [
            ...$staffMember->load(['workingHours', 'services:id,name', 'account:id,staff_member_id,role,active,ui_mode'])->toArray(),
            'cancelled_appointments' => $cancelled,
        ];
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'min:2', 'max:100'],
            'last_name' => ['required', 'string', 'min:2', 'max:100'],
            'title' => ['nullable', 'string', 'max:100'],
            'role' => ['sometimes', Rule::in(UserRole::staff())],
            'ui_mode' => ['sometimes', Rule::in(User::UI_MODES)],
            'phone' => ['required', 'string', 'max:30', 'regex:/^[\d\s+\-()]+$/'],
            'email' => ['required', 'email', 'max:255', Rule::unique('staff_members', 'email')->ignore($request->route('staffMember'))],
            'color' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'booking_confirmation' => ['nullable', Rule::in(BusinessSetting::CONFIRMATION_MODES)],
            'avatar' => ['nullable', 'string', 'max:2000000'],
            'active' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'service_ids' => ['array'],
            'service_ids.*' => ['integer', 'exists:services,id'],
            'rotation_weeks' => ['sometimes', 'integer', 'between:1,4'],
            'rotation_starts_on' => ['nullable', 'date_format:Y-m-d'],
            'working_hours' => ['array'],
            'working_hours.*.weekday' => ['required', 'integer', 'between:1,7'],
            'working_hours.*.week' => ['sometimes', 'integer', 'between:0,3'],
            'working_hours.*.starts_at' => ['required', 'date_format:H:i'],
            'working_hours.*.ends_at' => ['required', 'date_format:H:i', 'after:working_hours.*.starts_at'],
        ], [
            'working_hours.*.ends_at.after' => 'Kraj radnog vremena mora biti posle početka.',
        ]);

        $weeks = $data['rotation_weeks'] ?? 1;
        $data['working_hours'] = collect($data['working_hours'] ?? [])
            ->map(fn ($h) => [...$h, 'week' => $weeks > 1 ? (int) ($h['week'] ?? 0) : 0])
            ->all();
        if (collect($data['working_hours'])->contains(fn ($h) => $h['week'] >= $weeks)) {
            throw ValidationException::withMessages(['working_hours' => ['Smena je u nedelji koja nije deo rasporeda.']]);
        }
        if ($weeks > 1 && empty($data['rotation_starts_on'])) {
            $data['rotation_starts_on'] = now()->startOfWeek()->toDateString();
        }
        if (isset($data['rotation_starts_on'])) {
            $data['rotation_starts_on'] = CarbonImmutable::parse($data['rotation_starts_on'])->startOfWeek()->toDateString();
        }

        $this->ensureNoOverlap($data['working_hours']);
        $this->ensureWithinOpeningHours($data['working_hours']);

        return $data;
    }

    private function ensureNoOverlap(array $hours): void
    {
        $byDay = collect($hours)->groupBy(fn ($h) => $h['week'].'-'.$h['weekday']);

        foreach ($byDay as $intervals) {
            $sorted = $intervals->sortBy('starts_at')->values();

            for ($i = 1; $i < $sorted->count(); $i++) {
                if ($sorted[$i]['starts_at'] < $sorted[$i - 1]['ends_at']) {
                    throw ValidationException::withMessages([
                        'working_hours' => ['Smene u istom danu se preklapaju.'],
                    ]);
                }
            }
        }
    }

    private function ensureWithinOpeningHours(array $hours): void
    {
        $days = ['', 'Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota', 'Nedelja'];
        $week = OpeningHour::week();

        foreach ($hours as $h) {
            $opening = $week->get($h['weekday']);
            if (! $opening?->isOpen()) {
                throw ValidationException::withMessages(['working_hours' => ["{$days[$h['weekday']]}: salon tog dana ne radi."]]);
            }
            if ($h['starts_at'] < $opening->opens_at || $h['ends_at'] > $opening->closes_at) {
                throw ValidationException::withMessages(['working_hours' => ["{$days[$h['weekday']]}: smena {$h['starts_at']}–{$h['ends_at']} je van radnog vremena salona ({$opening->opens_at}–{$opening->closes_at})."]]);
            }
        }
    }

    private function persist(StaffMember $staff, array $data, User $actor): StaffMember
    {
        $staff->fill(collect($data)->except(['service_ids', 'working_hours', 'role', 'ui_mode'])->all())->save();

        if (array_key_exists('service_ids', $data)) {
            $staff->services()->sync($data['service_ids']);
        }

        if (array_key_exists('working_hours', $data)) {
            $staff->workingHours()->delete();
            $staff->workingHours()->createMany($data['working_hours']);
        }

        $account = $this->accounts->sync($staff);

        if ($account && isset($data['role']) && UserRole::from($data['role']) !== $account->role) {
            $this->changeRole($actor, $account, UserRole::from($data['role']));
        }
        if ($account && isset($data['ui_mode']) && ($actor->isOwner() || ! $account->isOwner())) {
            $account->forceFill(['ui_mode' => $data['ui_mode']])->save();
        }

        return $staff->load(['workingHours', 'services:id,name', 'account:id,staff_member_id,role,active,ui_mode']);
    }

    private function changeRole(User $actor, User $account, UserRole $role): void
    {
        if (! $actor->isOwner() && ($account->isOwner() || $role === UserRole::Owner)) {
            abort(403, 'Ulogu vlasnika menja samo vlasnik.');
        }
        if ($account->is($actor)) {
            throw ValidationException::withMessages(['role' => ['Ne možeš da promeniš svoju ulogu.']]);
        }
        if ($account->isOwner() && ! User::where('role', UserRole::Owner)->where('active', true)->whereKeyNot($account->id)->exists()) {
            throw ValidationException::withMessages(['role' => ['Mora da ostane bar jedan aktivan vlasnik.']]);
        }

        $account->forceFill(['role' => $role])->save();
    }
}
