<!DOCTYPE html>
<html lang="sr">
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 14mm; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 9pt; color: #000; }
        h1 { font-size: 13pt; margin: 0 0 1mm; }
        .lead { margin: 0 0 4mm; }
        .slip { width: 100%; border: 1pt solid #000; border-collapse: collapse; }
        .slip td { vertical-align: top; padding: 2mm 3mm; }
        .slip .left { width: 52%; border-right: 0.6pt solid #000; }
        .title { font-size: 11pt; font-weight: bold; text-align: right; }
        .label { font-size: 7pt; color: #333; margin-top: 2mm; }
        .box { border: 0.8pt solid #000; padding: 1.5mm 2mm; min-height: 9mm; font-size: 9.5pt; white-space: pre-line; }
        .row { width: 100%; border-collapse: collapse; }
        .row td { padding: 0 1mm 0 0; vertical-align: top; }
        .qr { text-align: center; margin-top: 6mm; }
        .qr img { width: 45mm; height: 45mm; }
        .hint { font-size: 8pt; color: #333; margin-top: 4mm; }
    </style>
</head>
<body>
<h1>Uplata za termin — {{ $business }}</h1>
<p class="lead">{{ \Illuminate\Support\Carbon::parse($slip['starts_at'])->format('d.m.Y. \u H:i') }} · {{ $slip['services'] }} · iznos {{ number_format($slip['amount'], 0, ',', '.') }} din.</p>

<table class="slip">
    <tr>
        <td class="left">
            <div class="label">uplatilac</div>
            <div class="box">{{ $slip['payer'] }}</div>
            <div class="label">svrha uplate</div>
            <div class="box">{{ $slip['purpose'] }}</div>
            <div class="label">primalac</div>
            <div class="box">{{ $slip['payee'] }}</div>
            <div class="label" style="margin-top: 6mm">pečat i potpis uplatioca</div>
            <div style="border-bottom: 0.6pt solid #000; height: 8mm;"></div>
        </td>
        <td>
            <div class="title">NALOG ZA UPLATU</div>
            <table class="row">
                <tr>
                    <td style="width: 22%"><div class="label">šifra plaćanja</div><div class="box">{{ $slip['payment_code'] }}</div></td>
                    <td style="width: 18%"><div class="label">valuta</div><div class="box">RSD</div></td>
                    <td><div class="label">iznos</div><div class="box">= {{ number_format($slip['amount'], 2, ',', '.') }}</div></td>
                </tr>
            </table>
            <div class="label">račun primaoca</div>
            <div class="box">{{ $slip['account'] }}</div>
            <table class="row">
                <tr>
                    <td style="width: 22%"><div class="label">model</div><div class="box">{{ $slip['model'] }}</div></td>
                    <td><div class="label">poziv na broj (odobrenje)</div><div class="box">{{ $slip['reference'] }}</div></td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<div class="qr">
    <img src="{{ $slip['qr'] }}" alt="IPS QR">
    <div class="hint">NBS IPS QR kod — skenirajte ga u aplikaciji za mobilno bankarstvo („IPS skeniraj"); svi podaci se popune sami.</div>
</div>
<p class="hint">Poziv na broj označava termin, pa salon lako prepoznaje uplatu na izvodu. Plaćanje u salonu (gotovina ili kartica) i dalje je moguće.</p>
</body>
</html>
