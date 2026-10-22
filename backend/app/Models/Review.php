<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['appointment_id', 'client_id', 'staff_member_id', 'rating', 'comment', 'visible', 'reply', 'replied_at'])]
class Review extends Model
{
    public const EDITABLE_DAYS = 30;

    protected function casts(): array
    {
        return [
            'rating' => 'integer',
            'visible' => 'boolean',
            'replied_at' => 'datetime',
        ];
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function staffMember(): BelongsTo
    {
        return $this->belongsTo(StaffMember::class);
    }

    public function publicAuthor(): string
    {
        $client = $this->client;
        if (! $client) {
            return 'Klijent';
        }
        $initial = mb_substr((string) $client->last_name, 0, 1);

        return trim($client->first_name.($initial !== '' ? ' '.$initial.'.' : ''));
    }

    public function presentPublic(): array
    {
        return [
            'id' => $this->id,
            'rating' => $this->rating,
            'comment' => $this->comment,
            'author' => $this->publicAuthor(),
            'staff_name' => $this->staffMember?->first_name,
            'services' => $this->appointment?->items->pluck('name')->implode(' + '),
            'reply' => $this->reply,
            'created_at' => $this->created_at?->toDateString(),
        ];
    }
}
