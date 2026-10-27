<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InstagramPost;
use App\Services\FreeSlotsStoryService;
use App\Services\InstagramPublisher;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class InstagramPostController extends Controller
{
    public function __construct(private InstagramPublisher $publisher) {}

    public function index()
    {
        return InstagramPost::query()
            ->select(['id', 'kind', 'source', 'caption', 'token', 'status', 'scheduled_at', 'published_at', 'permalink', 'error', 'slots'])
            ->selectRaw('image is not null as has_image')
            ->orderByDesc('scheduled_at')
            ->limit(30)
            ->get()
            ->map(fn (InstagramPost $post) => [...$post->present(), 'image_url' => $post->has_image ? $post->imageUrl() : null]);
    }

    public function store(Request $request)
    {
        $this->ensureAvailable();

        $data = $request->validate([
            'kind' => ['required', Rule::in(InstagramPost::KINDS)],
            'caption' => ['nullable', 'string', 'max:2200'],
            'image' => ['required', 'string', 'max:'.InstagramPost::MAX_IMAGE_LENGTH, 'regex:/^data:image\/jpeg;base64,/'],
            'scheduled_at' => ['nullable', 'date', 'after:now'],
        ], [
            'image.regex' => 'Slika mora biti JPEG.',
            'image.max' => 'Slika je prevelika.',
            'scheduled_at.after' => 'Vreme objave mora biti u budućnosti.',
        ]);

        $post = InstagramPost::create([
            'kind' => $data['kind'],
            'caption' => $data['kind'] === InstagramPost::KIND_POST ? (trim($data['caption'] ?? '') ?: null) : null,
            'image' => $data['image'],
            'status' => InstagramPost::STATUS_SCHEDULED,
            'scheduled_at' => isset($data['scheduled_at']) ? CarbonImmutable::parse($data['scheduled_at'])->setTimezone(config('app.timezone')) : now(),
            'created_by' => $request->user()->id,
        ]);

        if (! isset($data['scheduled_at'])) {
            $post = $this->publisher->publish($post);
        }

        return response()->json($post->present(), 201);
    }

    public function publish(InstagramPost $post)
    {
        $this->ensureAvailable();
        abort_unless(in_array($post->status, [InstagramPost::STATUS_FAILED, InstagramPost::STATUS_SCHEDULED], true) && $post->image, 422, 'Ova objava ne može ponovo da se objavi.');

        return $this->publisher->publish($post)->present();
    }

    public function destroy(InstagramPost $post)
    {
        abort_if($post->status === InstagramPost::STATUS_PUBLISHED, 422, 'Objava je već na Instagramu — obriši je u aplikaciji Instagram.');
        $post->delete();

        return response()->noContent();
    }

    public function freeSlotsPreview(FreeSlotsStoryService $freeSlots)
    {
        $date = CarbonImmutable::tomorrow();

        return ['label' => $freeSlots->dayLabel($date), ...($freeSlots->build($date) ?? ['date' => $date->toDateString(), 'ranges' => [], 'image' => null])];
    }

    public function media(string $token)
    {
        $post = InstagramPost::where('token', $token)->first();
        $bytes = $post?->imageBytes();
        abort_unless($bytes, 404);

        return response($bytes, 200, ['Content-Type' => 'image/jpeg', 'Cache-Control' => 'public, max-age=3600']);
    }

    private function ensureAvailable(): void
    {
        if (! $this->publisher->available()) {
            throw ValidationException::withMessages(['instagram' => ['Objavljivanje nije uključeno — poveži Instagram i uključi „Objavljivanje" u Podešavanjima.']]);
        }
    }
}
