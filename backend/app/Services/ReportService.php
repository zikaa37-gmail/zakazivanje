<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\BlockedTime;
use App\Models\BusinessSetting;
use App\Models\OpeningHour;
use App\Models\Review;
use App\Models\StaffMember;
use App\Models\User;
use App\Notifications\ReportNotification;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\CarbonImmutable;
use Carbon\CarbonPeriod;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ReportService
{
    public const PERIODS = ['day', 'week', 'month'];

    private const FILE_DAYS = 7;

    private const COUNTED = [Appointment::STATUS_PENDING, Appointment::STATUS_CONFIRMED, Appointment::STATUS_COMPLETED, Appointment::STATUS_NO_SHOW];

    private const STATUS_LABELS = [
        Appointment::STATUS_PENDING => 'Na čekanju',
        Appointment::STATUS_CONFIRMED => 'Potvrđen',
        Appointment::STATUS_COMPLETED => 'Završen',
        Appointment::STATUS_CANCELLED => 'Otkazan',
        Appointment::STATUS_NO_SHOW => 'Nije došao',
    ];

    private const MONTHS = ['', 'januar', 'februar', 'mart', 'april', 'maj', 'jun', 'jul', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar'];

    private const WEEKDAYS = ['', 'ponedeljak', 'utorak', 'sreda', 'četvrtak', 'petak', 'subota', 'nedelja'];

    public function __construct(private DashboardService $dashboard) {}

    public function ensureAllowed(User $user, ?int $staffMemberId): void
    {
        if ($user->isOwner() || $user->staff_member_id === null) {
            return;
        }

        if ($staffMemberId !== $user->staff_member_id) {
            throw ValidationException::withMessages(['staff_member_id' => ['Možeš da vidiš samo svoj izveštaj.']]);
        }
    }

    public function period(string $period, CarbonImmutable $date): array
    {
        [$from, $to] = match ($period) {
            'day' => [$date, $date],
            'week' => [$date->startOfWeek(), $date->endOfWeek()->startOfDay()],
            'month' => [$date->startOfMonth(), $date->endOfMonth()->startOfDay()],
        };

        $label = match ($period) {
            'day' => mb_convert_case(self::WEEKDAYS[$from->isoWeekday()], MB_CASE_TITLE).', '.$from->format('d.m.Y.'),
            'week' => 'Nedelja '.$from->format('d.m.').' – '.$to->format('d.m.Y.'),
            'month' => mb_convert_case(self::MONTHS[$from->month], MB_CASE_TITLE).' '.$from->year.'.',
        };

        return ['type' => $period, 'from' => $from, 'to' => $to, 'label' => $label];
    }

    public function build(?StaffMember $staff, string $period, CarbonImmutable $date): array
    {
        $range = $this->period($period, $date);
        $from = $range['from'];
        $to = $range['to'];

        $appointments = Appointment::query()
            ->whereBetween('starts_at', [$from->startOfDay(), $to->endOfDay()])
            ->when($staff, fn ($q) => $q->where('staff_member_id', $staff->id))
            ->with(['items', 'client:id,first_name,last_name', 'staffMember:id,first_name,last_name'])
            ->orderBy('starts_at')
            ->get();

        $blocks = BlockedTime::query()->where('starts_at', '<', $to->endOfDay())->where('ends_at', '>', $from->startOfDay())->get();
        $openingHours = OpeningHour::week();

        $staffMembers = $staff
            ? collect([$staff->loadMissing('workingHours')])
            : StaffMember::query()
                ->where(fn ($q) => $q->where('active', true)->orWhereIn('id', $appointments->pluck('staff_member_id')->filter()->unique()))
                ->with('workingHours')
                ->orderBy('sort_order')
                ->orderBy('first_name')
                ->get();

        $availableByStaff = $staffMembers->mapWithKeys(fn (StaffMember $s) => [$s->id => $this->dashboard->availableMinutes($s, $from, $to, $blocks, $openingHours)]);

        $reviews = Review::query()
            ->whereIn('appointment_id', $appointments->pluck('id'))
            ->get(['staff_member_id', 'rating']);

        return [
            'title' => $staff ? 'Izveštaj — '.trim($staff->first_name.' '.$staff->last_name) : 'Zbirni izveštaj',
            'business' => BusinessSetting::current()->name,
            'staff_member' => $staff ? ['id' => $staff->id, 'name' => trim($staff->first_name.' '.$staff->last_name), 'active' => $staff->active] : null,
            'period' => ['type' => $period, 'from' => $from->toDateString(), 'to' => $to->toDateString(), 'label' => $range['label']],
            'totals' => $this->totals($appointments, $availableByStaff->sum(), $reviews, $from),
            'staff' => $staff ? [] : $staffMembers->map(fn (StaffMember $s) => [
                'id' => $s->id,
                'name' => trim($s->first_name.' '.$s->last_name),
                'active' => $s->active,
                ...$this->totals($appointments->where('staff_member_id', $s->id), $availableByStaff[$s->id] ?? 0, $reviews->where('staff_member_id', $s->id), $from),
            ])->filter(fn ($row) => $row['appointments'] + $row['cancelled'] > 0 || $row['available_minutes'] > 0)->values()->all(),
            'days' => $period === 'day' ? [] : collect(CarbonPeriod::create($from, $to))->map(function ($day) use ($appointments) {
                $ofDay = $appointments->filter(fn ($a) => $a->starts_at->isSameDay($day));
                $completed = $ofDay->where('status', Appointment::STATUS_COMPLETED);

                return [
                    'date' => $day->format('Y-m-d'),
                    'label' => mb_substr(self::WEEKDAYS[$day->isoWeekday()], 0, 3).' '.$day->format('d.m.'),
                    'appointments' => $ofDay->whereIn('status', self::COUNTED)->count(),
                    'completed' => $completed->count(),
                    'cancelled' => $ofDay->where('status', Appointment::STATUS_CANCELLED)->count(),
                    'revenue' => round($completed->sum('total'), 2),
                ];
            })->values()->all(),
            'services' => $this->services($appointments),
            'appointments' => $period === 'day' || ($staff && $period === 'week') ? $appointments->map(fn (Appointment $a) => [
                'id' => $a->id,
                'date' => $a->starts_at->format('Y-m-d'),
                'time' => $a->starts_at->format('H:i').'–'.$a->ends_at->format('H:i'),
                'client' => $a->client ? trim($a->client->first_name.' '.$a->client->last_name) : '—',
                'staff' => $a->staffMember ? trim($a->staffMember->first_name.' '.$a->staffMember->last_name) : '—',
                'services' => $a->items->pluck('name')->join(', '),
                'status' => $a->status,
                'status_label' => self::STATUS_LABELS[$a->status] ?? $a->status,
                'total' => (float) $a->total,
                'paid' => $a->paid_at !== null,
            ])->values()->all() : [],
            'generated_at' => now()->format('d.m.Y. H:i'),
        ];
    }

    public function pdf(array $report): string
    {
        return Pdf::loadView('pdf.report', ['report' => $report])->setPaper('a4')->setOption('isFontSubsettingEnabled', true)->output();
    }

    public function send(User $recipient, array $report, string $channel): void
    {
        $pdf = $this->pdf($report);
        $fileName = $this->fileName($report);

        if ($channel === ReportNotification::CHANNEL_WHATSAPP) {
            if (WhatsAppService::normalizePhone($recipient->whatsapp_number ?: $recipient->phone) === null) {
                throw ValidationException::withMessages(['channel' => ['U profilu nema broja telefona za WhatsApp.']]);
            }
            $path = 'reports/'.Str::uuid().'.pdf';
            Storage::disk('local')->put($path, $pdf);
            $url = URL::temporarySignedRoute('reports.file', now()->addDays(self::FILE_DAYS), ['file' => basename($path), 'name' => $fileName]);
            $recipient->notifyNow(new ReportNotification($report, $channel, $this->summaryText($report), fileUrl: $url));

            return;
        }

        if (blank($recipient->email)) {
            throw ValidationException::withMessages(['channel' => ['Nalog nema email adresu.']]);
        }

        $recipient->notifyNow(new ReportNotification($report, $channel, $this->summaryText($report), $pdf, $fileName));
    }

    public function pruneFiles(): int
    {
        $disk = Storage::disk('local');
        $old = collect($disk->files('reports'))->filter(fn ($f) => $disk->lastModified($f) < now()->subDays(self::FILE_DAYS)->getTimestamp());
        $disk->delete($old->all());

        return $old->count();
    }

    public function fileName(array $report): string
    {
        $who = $report['staff_member'] ? str($report['staff_member']['name'])->slug() : 'zbirni';

        return "izvestaj-{$who}-{$report['period']['from']}".($report['period']['from'] !== $report['period']['to'] ? "-{$report['period']['to']}" : '').'.pdf';
    }

    public function summaryText(array $report): string
    {
        $t = $report['totals'];
        $money = fn ($v) => number_format($v, 0, ',', '.').' din.';

        return implode("\n", [
            "{$report['title']} · {$report['period']['label']}",
            "Termina: {$t['appointments']} (završeno {$t['completed']}, otkazano {$t['cancelled']}, nije došlo {$t['no_shows']})",
            'Prihod: '.$money($t['revenue']).' (naplaćeno '.$money($t['paid']).')',
            "Popunjenost: {$t['utilization']}%",
        ]);
    }

    private function totals(Collection $appointments, float $available, Collection $reviews, CarbonImmutable $from): array
    {
        $counted = $appointments->whereIn('status', self::COUNTED);
        $completed = $appointments->where('status', Appointment::STATUS_COMPLETED);
        $paid = $completed->whereNotNull('paid_at');
        $booked = $counted->where('status', '!=', Appointment::STATUS_NO_SHOW)->sum(fn ($a) => $a->starts_at->diffInMinutes($a->ends_at));
        $revenue = round($completed->sum('total'), 2);
        $clientIds = $counted->pluck('client_id')->filter()->unique();
        $firstVisits = $clientIds->isEmpty() ? collect() : Appointment::query()
            ->whereIn('client_id', $clientIds)
            ->whereIn('status', self::COUNTED)
            ->selectRaw('client_id, min(starts_at) as first_at')
            ->groupBy('client_id')
            ->pluck('first_at', 'client_id');

        return [
            'appointments' => $counted->count(),
            'completed' => $completed->count(),
            'upcoming' => $appointments->whereIn('status', Appointment::BLOCKING_STATUSES)->count(),
            'cancelled' => $appointments->where('status', Appointment::STATUS_CANCELLED)->count(),
            'cancelled_by_client' => $appointments->where('status', Appointment::STATUS_CANCELLED)->where('cancelled_by', 'client')->count(),
            'no_shows' => $appointments->where('status', Appointment::STATUS_NO_SHOW)->count(),
            'revenue' => $revenue,
            'discount' => round($completed->sum('discount'), 2),
            'paid' => round($paid->sum('total'), 2),
            'unpaid' => round($revenue - $paid->sum('total'), 2),
            'by_method' => collect(Appointment::PAYMENT_METHODS)->mapWithKeys(fn ($m) => [$m => round($paid->where('payment_method', $m)->sum('total'), 2)])->all(),
            'average_ticket' => $completed->count() > 0 ? round($completed->avg('total'), 2) : 0,
            'booked_minutes' => (int) $booked,
            'available_minutes' => (int) round($available),
            'utilization' => $available > 0 ? round(min(100, $booked / $available * 100), 1) : 0,
            'clients' => $clientIds->count(),
            'new_clients' => $firstVisits->filter(fn ($first) => CarbonImmutable::parse($first)->gte($from->startOfDay()))->count(),
            'rating' => $reviews->count() > 0 ? round($reviews->avg('rating'), 1) : null,
            'reviews' => $reviews->count(),
        ];
    }

    private function services(Collection $appointments): array
    {
        return $appointments
            ->whereIn('status', self::COUNTED)
            ->flatMap(fn (Appointment $a) => $a->items->map(fn ($item) => ['name' => $item->name, 'completed' => $a->status === Appointment::STATUS_COMPLETED, 'amount' => (float) $item->price - (float) $item->discount]))
            ->groupBy('name')
            ->map(fn ($rows, $name) => [
                'name' => $name,
                'count' => $rows->count(),
                'revenue' => round($rows->where('completed', true)->sum('amount'), 2),
            ])
            ->sortByDesc('count')
            ->values()
            ->all();
    }
}
