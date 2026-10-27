<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StaffMember;
use App\Notifications\ReportNotification;
use App\Services\ReportService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ReportController extends Controller
{
    public function __construct(private ReportService $reports) {}

    public function show(Request $request)
    {
        return $this->build($request);
    }

    public function pdf(Request $request)
    {
        $report = $this->build($request);

        return response($this->reports->pdf($report), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$this->reports->fileName($report).'"',
        ]);
    }

    public function send(Request $request)
    {
        $channel = $request->validate([
            'channel' => ['required', Rule::in([ReportNotification::CHANNEL_MAIL, ReportNotification::CHANNEL_WHATSAPP])],
        ])['channel'];

        $user = $request->user();
        $this->reports->send($user, $this->build($request), $channel);

        return response()->json([
            'message' => $channel === ReportNotification::CHANNEL_MAIL
                ? "Izveštaj je poslat na {$user->email}."
                : 'Izveštaj je poslat na WhatsApp.',
        ]);
    }

    public function file(Request $request, string $file)
    {
        $path = 'reports/'.basename($file);
        abort_unless(Storage::disk('local')->exists($path), 404);

        return response(Storage::disk('local')->get($path), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.basename((string) $request->query('name', 'izvestaj.pdf')).'"',
        ]);
    }

    private function build(Request $request): array
    {
        $data = $request->validate([
            'period' => ['required', Rule::in(ReportService::PERIODS)],
            'date' => ['required', 'date_format:Y-m-d'],
            'staff_member_id' => ['nullable', 'integer', 'exists:staff_members,id'],
        ]);

        $user = $request->user();
        $staffId = $data['staff_member_id'] ?? null;
        if (! $user->isOwner() && $user->staff_member_id !== null) {
            $staffId ??= $user->staff_member_id;
        }
        $this->reports->ensureAllowed($user, $staffId);

        return $this->reports->build(
            $staffId ? StaffMember::findOrFail($staffId) : null,
            $data['period'],
            CarbonImmutable::parse($data['date']),
        );
    }
}
