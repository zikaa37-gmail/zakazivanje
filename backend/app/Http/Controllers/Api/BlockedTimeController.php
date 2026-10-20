<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BlockedTime;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;

class BlockedTimeController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from'],
        ]);

        return BlockedTime::query()
            ->where('starts_at', '<', CarbonImmutable::parse($data['to'])->endOfDay())
            ->where('ends_at', '>', CarbonImmutable::parse($data['from'])->startOfDay())
            ->with('staffMember:id,first_name,last_name,color')
            ->orderBy('starts_at')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'staff_member_id' => ['nullable', 'integer', 'exists:staff_members,id'],
            'starts_at' => ['required', 'date_format:Y-m-d H:i'],
            'ends_at' => ['required', 'date_format:Y-m-d H:i', 'after:starts_at'],
            'reason' => ['nullable', 'string', 'max:150'],
        ], [
            'ends_at.after' => 'Kraj mora biti posle početka.',
        ]);

        return response()->json(BlockedTime::create($data)->load('staffMember:id,first_name,last_name,color'), 201);
    }

    public function destroy(BlockedTime $blockedTime)
    {
        $blockedTime->delete();

        return response()->json(['message' => 'Blokada je uklonjena.']);
    }
}
