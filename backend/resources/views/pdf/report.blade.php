@php
    $money = fn ($v) => number_format($v, 0, ',', '.').' din.';
    $hours = fn ($m) => intdiv($m, 60).' h'.($m % 60 ? ' '.($m % 60).' min' : '');
    $t = $report['totals'];
    $methods = ['cash' => 'Gotovina', 'card' => 'Kartica', 'bank' => 'Račun'];
@endphp
<!DOCTYPE html>
<html lang="sr">
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 14mm 12mm; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 8.5pt; color: #111; }
        h1 { font-size: 14pt; margin: 0; }
        h2 { font-size: 10.5pt; margin: 6mm 0 2mm; }
        .muted { color: #555; }
        .head { border-bottom: 1pt solid #111; padding-bottom: 2mm; margin-bottom: 4mm; }
        .tiles { width: 100%; border-collapse: separate; border-spacing: 1.5mm; margin: 0 -1.5mm; }
        .tiles td { border: 0.6pt solid #bbb; padding: 2mm; width: 25%; vertical-align: top; }
        .tile-label { font-size: 7pt; color: #555; }
        .tile-value { font-size: 12pt; font-weight: bold; margin-top: 0.5mm; }
        .tile-sub { font-size: 7pt; color: #555; }
        table.grid { width: 100%; border-collapse: collapse; }
        table.grid th { text-align: left; font-size: 7.5pt; color: #333; border-bottom: 0.8pt solid #111; padding: 1.2mm 1.5mm; }
        table.grid td { border-bottom: 0.4pt solid #ddd; padding: 1.2mm 1.5mm; vertical-align: top; }
        table.grid .num { text-align: right; white-space: nowrap; }
        table.grid tr.total td { font-weight: bold; border-top: 0.8pt solid #111; border-bottom: none; }
        .foot { margin-top: 6mm; font-size: 7pt; color: #555; }
    </style>
</head>
<body>
<div class="head">
    <h1>{{ $report['title'] }}</h1>
    <div>{{ $report['business'] }} · {{ $report['period']['label'] }}</div>
    @if ($report['staff_member'] && ! $report['staff_member']['active'])
        <div class="muted">Zaposleni trenutno nije aktivan.</div>
    @endif
</div>

<table class="tiles">
    <tr>
        <td>
            <div class="tile-label">Termini</div>
            <div class="tile-value">{{ $t['appointments'] }}</div>
            <div class="tile-sub">završeno {{ $t['completed'] }} · zakazano {{ $t['upcoming'] }}</div>
        </td>
        <td>
            <div class="tile-label">Prihod (završeni)</div>
            <div class="tile-value">{{ $money($t['revenue']) }}</div>
            <div class="tile-sub">prosečno {{ $money($t['average_ticket']) }}</div>
        </td>
        <td>
            <div class="tile-label">Naplaćeno</div>
            <div class="tile-value">{{ $money($t['paid']) }}</div>
            <div class="tile-sub">nenaplaćeno {{ $money($t['unpaid']) }}</div>
        </td>
        <td>
            <div class="tile-label">Popunjenost</div>
            <div class="tile-value">{{ $t['utilization'] }}%</div>
            <div class="tile-sub">{{ $hours($t['booked_minutes']) }} od {{ $hours($t['available_minutes']) }}</div>
        </td>
    </tr>
    <tr>
        <td>
            <div class="tile-label">Otkazano</div>
            <div class="tile-value">{{ $t['cancelled'] }}</div>
            <div class="tile-sub">od toga klijent {{ $t['cancelled_by_client'] }}</div>
        </td>
        <td>
            <div class="tile-label">Nije došlo</div>
            <div class="tile-value">{{ $t['no_shows'] }}</div>
        </td>
        <td>
            <div class="tile-label">Klijenti</div>
            <div class="tile-value">{{ $t['clients'] }}</div>
            <div class="tile-sub">novih {{ $t['new_clients'] }}</div>
        </td>
        <td>
            <div class="tile-label">Ocena</div>
            <div class="tile-value">{{ $t['rating'] !== null ? number_format($t['rating'], 1, ',', '') : '—' }}</div>
            <div class="tile-sub">recenzija: {{ $t['reviews'] }}</div>
        </td>
    </tr>
</table>

<h2>Naplata po načinu plaćanja</h2>
<table class="grid">
    <tr>
        @foreach ($methods as $key => $label)
            <th>{{ $label }}</th>
        @endforeach
        <th>Popusti</th>
    </tr>
    <tr>
        @foreach ($methods as $key => $label)
            <td>{{ $money($t['by_method'][$key]) }}</td>
        @endforeach
        <td>{{ $money($t['discount']) }}</td>
    </tr>
</table>

@if (count($report['staff']) > 0)
    <h2>Po zaposlenom</h2>
    <table class="grid">
        <tr>
            <th>Zaposleni</th>
            <th class="num">Termini</th>
            <th class="num">Završeno</th>
            <th class="num">Otkazano</th>
            <th class="num">Nije došlo</th>
            <th class="num">Prihod</th>
            <th class="num">Popunjenost</th>
            <th class="num">Ocena</th>
        </tr>
        @foreach ($report['staff'] as $row)
            <tr>
                <td>{{ $row['name'] }}@if (! $row['active']) <span class="muted">(neaktivan)</span>@endif</td>
                <td class="num">{{ $row['appointments'] }}</td>
                <td class="num">{{ $row['completed'] }}</td>
                <td class="num">{{ $row['cancelled'] }}</td>
                <td class="num">{{ $row['no_shows'] }}</td>
                <td class="num">{{ $money($row['revenue']) }}</td>
                <td class="num">{{ $row['utilization'] }}%</td>
                <td class="num">{{ $row['rating'] !== null ? number_format($row['rating'], 1, ',', '') : '—' }}</td>
            </tr>
        @endforeach
    </table>
@endif

@if (count($report['days']) > 0)
    <h2>Po danima</h2>
    <table class="grid">
        <tr>
            <th>Dan</th>
            <th class="num">Termini</th>
            <th class="num">Završeno</th>
            <th class="num">Otkazano</th>
            <th class="num">Prihod</th>
        </tr>
        @foreach ($report['days'] as $day)
            <tr>
                <td>{{ $day['label'] }}</td>
                <td class="num">{{ $day['appointments'] }}</td>
                <td class="num">{{ $day['completed'] }}</td>
                <td class="num">{{ $day['cancelled'] }}</td>
                <td class="num">{{ $money($day['revenue']) }}</td>
            </tr>
        @endforeach
        <tr class="total">
            <td>Ukupno</td>
            <td class="num">{{ $t['appointments'] }}</td>
            <td class="num">{{ $t['completed'] }}</td>
            <td class="num">{{ $t['cancelled'] }}</td>
            <td class="num">{{ $money($t['revenue']) }}</td>
        </tr>
    </table>
@endif

@if (count($report['services']) > 0)
    <h2>Usluge</h2>
    <table class="grid">
        <tr>
            <th>Usluga</th>
            <th class="num">Broj</th>
            <th class="num">Prihod (završeni)</th>
        </tr>
        @foreach ($report['services'] as $service)
            <tr>
                <td>{{ $service['name'] }}</td>
                <td class="num">{{ $service['count'] }}</td>
                <td class="num">{{ $money($service['revenue']) }}</td>
            </tr>
        @endforeach
    </table>
@endif

@if (count($report['appointments']) > 0)
    <h2>Termini</h2>
    <table class="grid">
        <tr>
            @if ($report['period']['type'] !== 'day')
                <th>Datum</th>
            @endif
            <th>Vreme</th>
            <th>Klijent</th>
            @if (! $report['staff_member'])
                <th>Zaposleni</th>
            @endif
            <th>Usluge</th>
            <th>Status</th>
            <th class="num">Iznos</th>
        </tr>
        @foreach ($report['appointments'] as $a)
            <tr>
                @if ($report['period']['type'] !== 'day')
                    <td>{{ \Illuminate\Support\Carbon::parse($a['date'])->format('d.m.') }}</td>
                @endif
                <td style="white-space: nowrap">{{ $a['time'] }}</td>
                <td>{{ $a['client'] }}</td>
                @if (! $report['staff_member'])
                    <td>{{ $a['staff'] }}</td>
                @endif
                <td>{{ $a['services'] }}</td>
                <td>{{ $a['status_label'] }}{{ $a['paid'] ? ' · plaćeno' : '' }}</td>
                <td class="num">{{ $money($a['total']) }}</td>
            </tr>
        @endforeach
    </table>
@endif

<div class="foot">Napravljeno {{ $report['generated_at'] }}</div>
</body>
</html>
