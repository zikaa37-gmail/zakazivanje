<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessSetting;
use App\Models\StaffMember;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StaffMemberController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate(['include_inactive' => ['sometimes', 'boolean']]);

        return StaffMember::query()
            ->with(['workingHours', 'services:id,name'])
            ->when(! ($data['include_inactive'] ?? true), fn ($q) => $q->where('active', true))
            ->orderBy('sort_order')
            ->orderBy('first_name')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);

        $staff = DB::transaction(fn () => $this->persist(new StaffMember, $data));

        return response()->json($staff, 201);
    }

    public function update(Request $request, StaffMember $staffMember)
    {
        $data = $this->validated($request);

        return DB::transaction(fn () => $this->persist($staffMember, $data));
    }

    public function destroy(StaffMember $staffMember)
    {
        $staffMember->delete();

        return response()->json(['message' => 'Zaposleni je obrisan.']);
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'min:2', 'max:100'],
            'last_name' => ['required', 'string', 'min:2', 'max:100'],
            'title' => ['nullable', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:30', 'regex:/^[\d\s+\-()]+$/'],
            'email' => ['nullable', 'email', 'max:255'],
            'color' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'booking_confirmation' => ['nullable', Rule::in(BusinessSetting::CONFIRMATION_MODES)],
            'avatar' => ['nullable', 'string', 'max:2000000'],
            'active' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'service_ids' => ['array'],
            'service_ids.*' => ['integer', 'exists:services,id'],
            'working_hours' => ['array'],
            'working_hours.*.weekday' => ['required', 'integer', 'between:1,7'],
            'working_hours.*.starts_at' => ['required', 'date_format:H:i'],
            'working_hours.*.ends_at' => ['required', 'date_format:H:i', 'after:working_hours.*.starts_at'],
        ], [
            'working_hours.*.ends_at.after' => 'Kraj radnog vremena mora biti posle početka.',
        ]);

        $this->ensureNoOverlap($data['working_hours'] ?? []);

        return $data;
    }

    private function ensureNoOverlap(array $hours): void
    {
        $byDay = collect($hours)->groupBy('weekday');

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

    private function persist(StaffMember $staff, array $data): StaffMember
    {
        $staff->fill(collect($data)->except(['service_ids', 'working_hours'])->all())->save();

        if (array_key_exists('service_ids', $data)) {
            $staff->services()->sync($data['service_ids']);
        }

        if (array_key_exists('working_hours', $data)) {
            $staff->workingHours()->delete();
            $staff->workingHours()->createMany($data['working_hours']);
        }

        return $staff->load(['workingHours', 'services:id,name']);
    }
}
