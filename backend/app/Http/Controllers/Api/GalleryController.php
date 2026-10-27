<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GalleryImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class GalleryController extends Controller
{
    public function publicIndex()
    {
        return GalleryImage::query()
            ->where('visible', true)
            ->with('service:id,name')
            ->orderBy('position')
            ->orderByDesc('id')
            ->get()
            ->map->present();
    }

    public function image(GalleryImage $image)
    {
        abort_unless(preg_match('/^data:image\/[a-z+]+;base64,(.+)$/s', $image->data, $match), 404);

        return response(base64_decode($match[1]), 200, [
            'Content-Type' => $image->mime,
            'Cache-Control' => 'public, max-age=604800',
        ]);
    }

    public function index()
    {
        return GalleryImage::query()
            ->with('service:id,name')
            ->orderBy('position')
            ->orderByDesc('id')
            ->get()
            ->map->present();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'data' => ['required', 'string', 'max:'.GalleryImage::MAX_DATA_LENGTH, 'regex:/^data:image\/(jpeg|png|webp);base64,/'],
            'width' => ['required', 'integer', 'min:1', 'max:4000'],
            'height' => ['required', 'integer', 'min:1', 'max:4000'],
            ...$this->detailRules(),
        ], [
            'data.max' => 'Slika je prevelika.',
            'data.regex' => 'Dozvoljene su JPG, PNG i WEBP slike.',
        ]);
        preg_match('/^data:(image\/[a-z+]+);base64,/', $data['data'], $match);

        $image = GalleryImage::create([
            ...$data,
            'mime' => $match[1],
            'position' => (int) GalleryImage::min('position') - 1,
        ]);

        return response()->json($image->refresh()->load('service:id,name')->present(), 201);
    }

    public function update(Request $request, GalleryImage $image)
    {
        $image->update($request->validate($this->detailRules()));

        return $image->load('service:id,name')->present();
    }

    public function reorder(Request $request)
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'distinct', 'exists:gallery_images,id'],
        ]);

        DB::transaction(function () use ($data) {
            foreach ($data['ids'] as $position => $id) {
                GalleryImage::whereKey($id)->update(['position' => $position]);
            }
        });

        return $this->index();
    }

    public function destroy(GalleryImage $image)
    {
        $image->delete();

        return response()->json(['message' => 'Slika je obrisana.']);
    }

    private function detailRules(): array
    {
        return [
            'caption' => ['nullable', 'string', 'max:200'],
            'service_id' => ['nullable', 'integer', 'exists:services,id'],
            'kind' => ['sometimes', Rule::in(GalleryImage::KINDS)],
            'featured' => ['sometimes', 'boolean'],
            'visible' => ['sometimes', 'boolean'],
        ];
    }
}
