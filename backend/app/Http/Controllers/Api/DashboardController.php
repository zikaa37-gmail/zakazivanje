<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class DashboardController extends Controller
{
    public function __construct(private DashboardService $dashboard) {}

    public function today(Request $request)
    {
        $data = $request->validate(['date' => ['nullable', 'date_format:Y-m-d']]);

        return $this->dashboard->today(isset($data['date']) ? CarbonImmutable::parse($data['date']) : CarbonImmutable::today());
    }

    public function stats(Request $request)
    {
        $data = $request->validate([
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from'],
        ]);

        $from = CarbonImmutable::parse($data['from']);
        $to = CarbonImmutable::parse($data['to']);

        if ($from->diffInDays($to) > 366) {
            throw ValidationException::withMessages(['to' => ['Period može biti najviše godinu dana.']]);
        }

        return $this->dashboard->stats($from, $to);
    }
}
