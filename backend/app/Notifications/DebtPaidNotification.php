<?php

namespace App\Notifications;

use App\Models\Appointment;
use App\Models\User;

class DebtPaidNotification
{
    private const METHODS = ['cash' => 'gotovinom', 'card' => 'karticom', 'bank' => 'uplatom na račun'];

    public function __construct(private Appointment $appointment, private float $amount, private ?User $by) {}

    public function toInbox(object $notifiable): array
    {
        $client = $this->appointment->client?->salonName() ?? 'klijent';
        $method = self::METHODS[$this->appointment->payment_method] ?? '';
        $left = $this->appointment->outstanding();
        $parts = array_filter([
            number_format($this->amount, 0, ',', '.').' din. '.$method,
            'termin '.$this->appointment->starts_at->format('d.m. H:i'),
            $this->by ? 'naplatio/la '.$this->by->first_name : null,
            $left > 0 ? 'ostaje još '.number_format($left, 0, ',', '.').' din.' : 'dug je zatvoren',
        ]);

        return [
            'kind' => 'debt_paid',
            'title' => "Naplaćen dug: {$client}",
            'body' => implode(' · ', $parts),
            'link' => '/admin/appointments?date='.$this->appointment->starts_at->format('Y-m-d'),
        ];
    }
}
