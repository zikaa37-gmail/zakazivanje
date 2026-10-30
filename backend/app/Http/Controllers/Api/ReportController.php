<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StaffMember;
use App\Models\User;
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
        $this->ensureCanView($request);

        return $this->build($request);
    }

    public function pdf(Request $request)
    {
        $this->ensureCanView($request);
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
        $report = $this->build($request);

        $own = $user->staff_member_id !== null && (int) $request->input('staff_member_id') === $user->staff_member_id;
        if ($user->isOfficeWorker() && ! $own) {
            $owners = User::where('role', User::ROLE_OWNER)->where('active', true)->get();
            foreach ($owners as $owner) {
                $this->reports->send($owner, $report, $channel);
            }

            return response()->json(['message' => 'Izveštaj je poslat vlasniku: '.$owners->map(fn (User $o) => trim("{$o->first_name} {$o->last_name}"))->join(', ').'.']);
        }

        $this->reports->send($user, $report, $channel);

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

    private function ensureCanView(Request $request): void
    {
        $user = $request->user();
        $own = $user->staff_member_id !== null && (int) $request->input('staff_member_id') === $user->staff_member_id;
        abort_if($user->isOfficeWorker() && ! $own, 403, 'Izveštaje pregleda vlasnik — ti možeš da ih pošalješ vlasniku (svoj izveštaj možeš da vidiš).');
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
        if ($user->isServiceWorker()) {
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
