<?php

namespace App\Services;

use App\Models\BusinessSetting;
use App\Models\Service;
use Carbon\CarbonImmutable;
use GdImage;

class FreeSlotsStoryService
{
    private const WIDTH = 1080;

    private const HEIGHT = 1920;

    private const MAX_RANGES = 8;

    private const DEFAULT_PRIMARY = '#0f766e';

    private const WEEKDAYS = [1 => 'ponedeljak', 'utorak', 'sreda', 'četvrtak', 'petak', 'subota', 'nedelja'];

    public function __construct(private AvailabilityService $availability, private DemandService $demand) {}

    public function ranges(CarbonImmutable $date): array
    {
        $interval = BusinessSetting::current()->slot_interval_minutes;

        $times = Service::query()->where('active', true)->get()
            ->flatMap(fn (Service $service) => collect($this->availability->slots(collect([$service]), null, $date))->pluck('time'))
            ->unique()
            ->filter(fn (string $time) => $this->demand->isOffPeak($date->setTimeFromTimeString($time)))
            ->sort()
            ->values();

        $ranges = [];
        foreach ($times as $time) {
            $last = count($ranges) - 1;
            if ($last >= 0 && $date->setTimeFromTimeString($ranges[$last]['to'])->addMinutes($interval)->format('H:i') === $time) {
                $ranges[$last]['to'] = $time;
            } else {
                $ranges[] = ['from' => $time, 'to' => $time];
            }
        }

        return array_slice($ranges, 0, self::MAX_RANGES);
    }

    public function build(CarbonImmutable $date): ?array
    {
        $ranges = $this->ranges($date);
        if ($ranges === []) {
            return null;
        }

        return ['date' => $date->toDateString(), 'ranges' => $ranges, 'image' => $this->render($date, $ranges)];
    }

    public function dayLabel(CarbonImmutable $date): string
    {
        $prefix = match (true) {
            $date->isToday() => 'danas, ',
            $date->isTomorrow() => 'sutra, ',
            default => '',
        };

        return $prefix.self::WEEKDAYS[$date->isoWeekday()].' '.$date->format('d.m.');
    }

    private function render(CarbonImmutable $date, array $ranges): string
    {
        $settings = BusinessSetting::current();
        $image = imagecreatetruecolor(self::WIDTH, self::HEIGHT);
        [$r, $g, $b] = $this->rgb(preg_match('/^#[0-9a-f]{6}$/i', (string) $settings->theme_primary) ? $settings->theme_primary : self::DEFAULT_PRIMARY);
        $primary = imagecolorallocate($image, $r, $g, $b);
        $dark = imagecolorallocate($image, (int) ($r * 0.65), (int) ($g * 0.65), (int) ($b * 0.65));
        $white = imagecolorallocate($image, 255, 255, 255);
        $soft = imagecolorallocate($image, (int) ($r * 0.1 + 229.5), (int) ($g * 0.1 + 229.5), (int) ($b * 0.1 + 229.5));

        imagefilledrectangle($image, 0, 0, self::WIDTH, self::HEIGHT, $primary);
        imagefilledrectangle($image, 0, (int) (self::HEIGHT * 0.82), self::WIDTH, self::HEIGHT, $dark);

        $y = 170;
        if ($logo = $this->logo($settings->logo)) {
            $size = 180;
            imagecopyresampled($image, $logo, (int) ((self::WIDTH - $size) / 2), $y, 0, 0, $size, $size, imagesx($logo), imagesy($logo));
            $y += $size + 60;
        }

        $this->text($image, $settings->name, 52, $white, $y + 52, true);
        $this->text($image, 'Slobodni termini', 96, $white, $y + 220, true);
        $this->text($image, $this->dayLabel($date), 54, $white, $y + 310);

        $top = $y + 400;
        $rowHeight = 130;
        $columns = count($ranges) > 4 ? 2 : 1;
        $rows = (int) ceil(count($ranges) / $columns);
        $panelWidth = self::WIDTH - 180;
        imagefilledrectangle($image, 90, $top, self::WIDTH - 90, $top + 60 + $rows * $rowHeight, $soft);
        foreach ($ranges as $i => $range) {
            $label = $range['from'] === $range['to'] ? $range['from'] : "{$range['from']} – {$range['to']}";
            $column = intdiv($i, $rows);
            $left = 90 + $column * intdiv($panelWidth, $columns);
            $this->text($image, $label, $columns === 2 ? 58 : 68, $primary, $top + 30 + ($i % $rows) * $rowHeight + 90, true, $left, intdiv($panelWidth, $columns));
        }

        $footer = (int) (self::HEIGHT * 0.82);
        $this->text($image, 'Zakaži preko linka u biju', 54, $white, $footer + 130, true);
        $host = parse_url((string) config('app.frontend_url'), PHP_URL_HOST);
        if ($host) {
            $this->text($image, $host, 40, $white, $footer + 220);
        }

        ob_start();
        imagejpeg($image, null, 88);
        $jpeg = ob_get_clean();
        imagedestroy($image);

        return 'data:image/jpeg;base64,'.base64_encode($jpeg);
    }

    private function text(GdImage $image, string $text, int $size, int $color, int $baseline, bool $bold = false, int $left = 0, int $width = self::WIDTH): void
    {
        $font = $this->font($bold);
        $box = imagettfbbox($size, 0, $font, $text);
        while ($box[2] - $box[0] > $width - 140 && $size > 20) {
            $size -= 4;
            $box = imagettfbbox($size, 0, $font, $text);
        }
        imagettftext($image, $size, 0, $left + (int) (($width - ($box[2] - $box[0])) / 2), $baseline, $color, $font, $text);
    }

    private function font(bool $bold): string
    {
        return base_path('vendor/dompdf/dompdf/lib/fonts/'.($bold ? 'DejaVuSans-Bold.ttf' : 'DejaVuSans.ttf'));
    }

    private function logo(?string $dataUrl): ?GdImage
    {
        if (! $dataUrl || ! preg_match('/^data:image\/(png|jpeg|webp);base64,(.+)$/s', $dataUrl, $match)) {
            return null;
        }

        return @imagecreatefromstring(base64_decode($match[2])) ?: null;
    }

    private function rgb(string $hex): array
    {
        return array_map(fn ($part) => hexdec($part), str_split(ltrim($hex, '#'), 2));
    }
}
