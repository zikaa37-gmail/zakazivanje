<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Models\Review;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\ValidationException;

class ReviewService
{
    public function canReview(Appointment $appointment): bool
    {
        if (! BusinessSetting::current()->reviews_enabled || $appointment->status !== Appointment::STATUS_COMPLETED) {
            return false;
        }
        $review = $appointment->relationLoaded('review') ? $appointment->review : $appointment->review()->first();

        return ! $review || $review->created_at->gt(now()->subDays(Review::EDITABLE_DAYS));
    }

    public function save(Appointment $appointment, int $rating, ?string $comment): Review
    {
        if (! $this->canReview($appointment)) {
            throw ValidationException::withMessages(['rating' => ['Ovaj termin više ne može da se oceni.']]);
        }

        $review = Review::updateOrCreate(
            ['appointment_id' => $appointment->id],
            [
                'client_id' => $appointment->client_id,
                'staff_member_id' => $appointment->staff_member_id,
                'rating' => $rating,
                'comment' => $comment !== null && trim($comment) !== '' ? trim($comment) : null,
            ],
        );

        return $review->refresh();
    }

    public function summary(?Builder $query = null): array
    {
        $rows = ($query ?? Review::query())->selectRaw('rating, count(*) as total')->groupBy('rating')->pluck('total', 'rating');
        $count = (int) $rows->sum();
        $sum = $rows->reduce(fn ($carry, $total, $rating) => $carry + $rating * $total, 0);

        return [
            'average' => $count ? round($sum / $count, 1) : null,
            'count' => $count,
            'distribution' => collect([5, 4, 3, 2, 1])->map(fn ($r) => ['rating' => $r, 'count' => (int) ($rows[$r] ?? 0)])->all(),
        ];
    }
}
