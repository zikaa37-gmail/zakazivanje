<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Models\Review;
use App\Models\StaffMember;
use App\Services\ReviewService;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function __construct(private ReviewService $reviews) {}

    public function publicIndex()
    {
        if (! BusinessSetting::current()->reviews_enabled) {
            return ['enabled' => false, 'summary' => $this->reviews->summary(Review::whereRaw('0 = 1')), 'items' => []];
        }

        return [
            'enabled' => true,
            'summary' => $this->reviews->summary(Review::where('visible', true)),
            'items' => Review::query()
                ->where('visible', true)
                ->with(['client:id,first_name,last_name', 'staffMember:id,first_name', 'appointment.items'])
                ->latest()
                ->limit(30)
                ->get()
                ->map->presentPublic(),
        ];
    }

    public function index(Request $request)
    {
        $data = $request->validate([
            'rating' => ['nullable', 'integer', 'between:1,5'],
            'staff_member_id' => ['nullable', 'integer'],
            'visible' => ['nullable', 'boolean'],
        ]);

        $items = Review::query()
            ->when($data['rating'] ?? null, fn ($q, $rating) => $q->where('rating', $rating))
            ->when($data['staff_member_id'] ?? null, fn ($q, $id) => $q->where('staff_member_id', $id))
            ->when(isset($data['visible']), fn ($q) => $q->where('visible', $data['visible']))
            ->with(['client:id,first_name,last_name,email,phone', 'staffMember:id,first_name,last_name,color', 'appointment:id,starts_at', 'appointment.items'])
            ->latest()
            ->limit(200)
            ->get();

        $staff = StaffMember::query()
            ->whereHas('reviews')
            ->orderBy('first_name')
            ->get(['id', 'first_name', 'last_name', 'color'])
            ->map(fn (StaffMember $member) => [
                'id' => $member->id,
                'name' => trim($member->first_name.' '.$member->last_name),
                'color' => $member->color,
                ...$this->reviews->summary(Review::where('staff_member_id', $member->id)),
            ]);

        return [
            'summary' => $this->reviews->summary(),
            'staff' => $staff,
            'items' => $items,
        ];
    }

    public function update(Request $request, Review $review)
    {
        $data = $request->validate([
            'visible' => ['sometimes', 'boolean'],
            'reply' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);

        if (array_key_exists('reply', $data)) {
            $data['reply'] = $data['reply'] !== null && trim($data['reply']) !== '' ? trim($data['reply']) : null;
            $data['replied_at'] = $data['reply'] ? now() : null;
        }
        $review->update($data);

        return $review->load(['client:id,first_name,last_name,email,phone', 'staffMember:id,first_name,last_name,color', 'appointment:id,starts_at', 'appointment.items']);
    }

    public function store(Request $request, Appointment $appointment)
    {
        abort_unless($appointment->client_id === $request->user()->id, 404);

        $data = $request->validate([
            'rating' => ['required', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string', 'max:1000'],
        ], ['rating.required' => 'Izaberi ocenu od 1 do 5.']);

        return $this->reviews->save($appointment, $data['rating'], $data['comment'] ?? null);
    }
}
