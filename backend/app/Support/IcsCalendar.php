<?php

namespace App\Support;

use App\Models\Appointment;
use App\Models\BusinessSetting;

class IcsCalendar
{
    public static function forAppointment(Appointment $appointment, bool $cancelled = false): string
    {
        $business = BusinessSetting::current();
        $format = fn ($date) => $date->copy()->setTimezone('UTC')->format('Ymd\THis\Z');
        $escape = fn (?string $text) => str_replace(["\\", ';', ',', "\n"], ['\\\\', '\;', '\,', '\n'], (string) $text);

        $summary = $appointment->items->pluck('name')->join(' + ').' — '.$business->name;
        $location = trim(implode(', ', array_filter([$business->address, $business->city])));
        $staff = $appointment->staffMember ? trim($appointment->staffMember->first_name.' '.$appointment->staffMember->last_name) : '';

        $lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Zakazivanje//SR',
            'METHOD:'.($cancelled ? 'CANCEL' : 'PUBLISH'),
            'BEGIN:VEVENT',
            'UID:appointment-'.$appointment->id.'@'.parse_url((string) config('app.url'), PHP_URL_HOST),
            'DTSTAMP:'.$format(now()),
            'DTSTART:'.$format($appointment->starts_at),
            'DTEND:'.$format($appointment->ends_at),
            'SUMMARY:'.$escape($summary),
            'DESCRIPTION:'.$escape($staff ? "Kod: {$staff}" : ''),
            'LOCATION:'.$escape($location),
            'STATUS:'.($cancelled ? 'CANCELLED' : 'CONFIRMED'),
            'SEQUENCE:'.($cancelled ? 1 : 0),
            'END:VEVENT',
            'END:VCALENDAR',
        ];

        return implode("\r\n", $lines)."\r\n";
    }
}
