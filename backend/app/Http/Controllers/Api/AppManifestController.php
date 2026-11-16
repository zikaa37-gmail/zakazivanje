<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessSetting;
use GdImage;

class AppManifestController extends Controller
{
    private const SIZES = [180, 192, 512];

    private const FALLBACK_COLOR = '#0f766e';

    public function manifest()
    {
        $business = BusinessSetting::current();
        $version = substr(md5(($business->logo ?? '').$business->updated_at), 0, 8);
        $color = $this->color($business);

        return response()->json([
            'name' => $business->name,
            'short_name' => $business->name,
            'description' => 'Zakazivanje termina — '.$business->name,
            'start_url' => '/',
            'scope' => '/',
            'display' => 'standalone',
            'background_color' => '#ffffff',
            'theme_color' => $color,
            'lang' => 'sr-Latn',
            'icons' => [
                ['src' => "/api/public/app-icon/192.png?v={$version}", 'sizes' => '192x192', 'type' => 'image/png', 'purpose' => 'any'],
                ['src' => "/api/public/app-icon/512.png?v={$version}", 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'any'],
                ['src' => "/api/public/app-icon/512.png?v={$version}&maskable=1", 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'maskable'],
            ],
        ], 200, ['Content-Type' => 'application/manifest+json', 'Cache-Control' => 'public, max-age=3600'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    public function icon(int $size)
    {
        abort_unless(in_array($size, self::SIZES, true), 404);
        $business = BusinessSetting::current();
        $maskable = request()->boolean('maskable');

        $canvas = imagecreatetruecolor($size, $size);
        $logo = $this->logo($business->logo);
        [$r, $g, $b] = $logo ? $this->cornerColor($logo) : $this->rgb($this->color($business));
        imagefill($canvas, 0, 0, imagecolorallocate($canvas, $r, $g, $b));

        if ($logo) {
            $padding = (int) round($size * ($maskable ? 0.2 : 0.08));
            $box = $size - 2 * $padding;
            $scale = min($box / imagesx($logo), $box / imagesy($logo));
            $w = (int) round(imagesx($logo) * $scale);
            $h = (int) round(imagesy($logo) * $scale);
            imagecopyresampled($canvas, $logo, (int) (($size - $w) / 2), (int) (($size - $h) / 2), 0, 0, $w, $h, imagesx($logo), imagesy($logo));
        } else {
            $letter = mb_strtoupper(mb_substr(trim($business->name) ?: 'Z', 0, 1));
            $font = base_path('vendor/dompdf/dompdf/lib/fonts/DejaVuSans-Bold.ttf');
            $points = $size * ($maskable ? 0.32 : 0.42);
            $bbox = imagettfbbox($points, 0, $font, $letter);
            $x = (int) (($size - ($bbox[2] - $bbox[0])) / 2 - $bbox[0]);
            $y = (int) (($size - ($bbox[1] - $bbox[7])) / 2 - $bbox[7]);
            imagettftext($canvas, $points, 0, $x, $y, imagecolorallocate($canvas, 255, 255, 255), $font, $letter);
        }

        ob_start();
        imagepng($canvas);
        $png = ob_get_clean();

        return response($png, 200, ['Content-Type' => 'image/png', 'Cache-Control' => 'public, max-age=604800']);
    }

    private function color(BusinessSetting $business): string
    {
        return preg_match('/^#[0-9a-f]{6}$/i', (string) $business->theme_primary) ? $business->theme_primary : self::FALLBACK_COLOR;
    }

    private function cornerColor(GdImage $logo): array
    {
        $color = imagecolorsforindex($logo, imagecolorat($logo, 1, 1));

        return $color['alpha'] > 60 ? [255, 255, 255] : [$color['red'], $color['green'], $color['blue']];
    }

    private function rgb(string $hex): array
    {
        return array_map('hexdec', str_split(ltrim($hex, '#'), 2));
    }

    private function logo(?string $dataUrl): ?GdImage
    {
        if (! $dataUrl || ! preg_match('/^data:image\/(png|jpeg|webp);base64,(.+)$/s', $dataUrl, $match)) {
            return null;
        }
        $image = @imagecreatefromstring(base64_decode($match[2]));

        return $image instanceof GdImage ? $image : null;
    }
}
