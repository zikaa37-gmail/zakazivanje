<?php

namespace App\Services;

use App\Models\BusinessSetting;
use App\Models\OpeningHour;
use App\Models\Promotion;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\Shift;
use App\Models\StaffMember;
use App\Models\User;
use Database\Seeders\DemoDataSeeder;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use RuntimeException;

class SalonTemplateService
{
    public const FILE = 'salon.json';

    private const BUSINESS_EXCLUDED = ['ai_api_key', 'logo', 'cover_image', 'note_always_notify_ids'];

    private const SERVICE_FIELDS = ['name', 'description', 'audience', 'booking_confirmation', 'duration_minutes', 'processing_after_minutes', 'processing_minutes', 'price', 'active', 'paused_until', 'cancellation_fee_type', 'cancellation_fee_value', 'cancellation_free_late'];

    private const STAFF_FIELDS = ['first_name', 'last_name', 'title', 'phone', 'email', 'color', 'booking_confirmation', 'active', 'rotation_weeks', 'rotation_starts_on'];

    private const PROMOTION_FIELDS = ['name', 'code', 'max_uses', 'once_per_client', 'type', 'description', 'discount_percent', 'discount_amount', 'package_price', 'buy_quantity', 'free_quantity', 'loyalty_visits', 'starts_on', 'ends_on', 'weekdays', 'active'];

    public static function directory(string $slug): string
    {
        return database_path('data/salons/'.Str::slug($slug));
    }

    public function export(string $dir): array
    {
        $business = BusinessSetting::current();
        $categories = ServiceCategory::orderBy('sort_order')->orderBy('id')->get();
        $services = Service::with('serviceCategory')->orderBy('sort_order')->orderBy('id')->get();
        $staff = StaffMember::with(['workingHours', 'services'])->orderBy('sort_order')->orderBy('id')->get();
        $staffIndex = $staff->pluck('id')->flip();

        $data = [
            'business' => collect($business->getFillable())
                ->diff(self::BUSINESS_EXCLUDED)
                ->mapWithKeys(fn (string $key) => [$key => $business->getRawOriginal($key)])
                ->all(),
            'opening_hours' => OpeningHour::orderBy('weekday')->get()->map(fn (OpeningHour $h) => [
                'weekday' => $h->weekday, 'opens_at' => $this->time($h->opens_at), 'closes_at' => $this->time($h->closes_at),
            ])->values()->all(),
            'shifts' => Shift::orderBy('sort_order')->get()->map(fn (Shift $s) => [
                'name' => $s->name, 'starts_at' => $this->time($s->starts_at), 'ends_at' => $this->time($s->ends_at),
            ])->values()->all(),
            'categories' => $categories->map(fn (ServiceCategory $c) => ['name' => $c->name, 'active' => (bool) $c->active])->values()->all(),
            'services' => $services->map(fn (Service $s) => [
                'category' => $s->serviceCategory?->name,
                ...collect(self::SERVICE_FIELDS)->mapWithKeys(fn ($key) => [$key => $s->getRawOriginal($key)])->all(),
            ])->values()->all(),
            'staff' => $staff->map(fn (StaffMember $m) => [
                ...collect(self::STAFF_FIELDS)->mapWithKeys(fn ($key) => [$key => $m->getRawOriginal($key)])->all(),
                'working_hours' => $m->workingHours->sortBy(['week', 'weekday', 'starts_at'])->map(fn ($h) => [
                    'weekday' => $h->weekday, 'week' => $h->week, 'starts_at' => $this->time($h->starts_at), 'ends_at' => $this->time($h->ends_at),
                ])->values()->all(),
                'services' => $m->services->pluck('name')->values()->all(),
            ])->values()->all(),
            'promotions' => Promotion::with('services')->orderBy('id')->get()->map(fn (Promotion $p) => [
                ...collect(self::PROMOTION_FIELDS)->mapWithKeys(fn ($key) => [$key => $key === 'weekdays' ? $p->weekdays : $p->getRawOriginal($key)])->all(),
                'services' => $p->services->pluck('name')->values()->all(),
            ])->values()->all(),
            'accounts' => User::whereIn('role', User::STAFF_ROLES)->where('active', true)->orderBy('id')->get()->map(fn (User $u) => [
                'first_name' => $u->first_name,
                'last_name' => $u->last_name,
                'email' => $u->email,
                'phone' => $u->phone,
                'role' => $u->role,
                'staff' => $u->staff_member_id !== null ? $staffIndex->get($u->staff_member_id) : null,
            ])->values()->all(),
        ];

        File::ensureDirectoryExists($dir);
        File::put($dir.'/'.self::FILE, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)."\n");
        $this->writeImage($dir, 'logo', $business->logo);
        $this->writeImage($dir, 'cover', $business->cover_image);

        return $this->counts($data);
    }

    public function read(string $dir): array
    {
        $path = $dir.'/'.self::FILE;
        if (! File::exists($path)) {
            throw new RuntimeException("Nema šablona: {$path}");
        }

        return json_decode(File::get($path), true, flags: JSON_THROW_ON_ERROR);
    }

    public function keptUsers(array $emails, bool $clients = false): Collection
    {
        return User::query()
            ->where(fn ($q) => $q->whereIn('email', $emails)->when($clients, fn ($q) => $q->orWhere(fn ($q) => $q
                ->where('role', User::ROLE_CLIENT)
                ->where(fn ($q) => $q->whereNull('email')->orWhere('email', 'not like', '%@'.DemoDataSeeder::DOMAIN)))))
            ->orderBy('id')
            ->get()
            ->map(fn (User $u) => $u->getAttributes());
    }

    public function wipe(): void
    {
        $prefix = DB::getTablePrefix();
        Schema::disableForeignKeyConstraints();
        try {
            foreach (Schema::getTables() as $table) {
                $name = Str::after($table['name'], $prefix);
                if ($prefix !== '' && ! str_starts_with($table['name'], $prefix)) {
                    continue;
                }
                if (in_array($name, ['migrations', 'sqlite_sequence'], true)) {
                    continue;
                }
                DB::table($name)->truncate();
            }
        } finally {
            Schema::enableForeignKeyConstraints();
        }
    }

    public function load(string $dir, ?string $password = null, ?Collection $kept = null): array
    {
        $data = $this->read($dir);

        return DB::transaction(function () use ($data, $dir, $password, $kept) {
            $business = BusinessSetting::current();
            $business->forceFill([
                ...Arr::except($data['business'] ?? [], self::BUSINESS_EXCLUDED),
                'logo' => $this->readImage($dir, 'logo'),
                'cover_image' => $this->readImage($dir, 'cover'),
            ])->save();

            foreach ($data['opening_hours'] ?? [] as $hour) {
                OpeningHour::updateOrCreate(['weekday' => $hour['weekday']], Arr::only($hour, ['opens_at', 'closes_at']));
            }
            foreach ($data['shifts'] ?? [] as $i => $shift) {
                Shift::create([...Arr::only($shift, ['name', 'starts_at', 'ends_at']), 'sort_order' => $i]);
            }

            $categories = collect($data['categories'] ?? [])->mapWithKeys(fn (array $c, int $i) => [
                $c['name'] => ServiceCategory::create(['name' => $c['name'], 'active' => $c['active'] ?? true, 'sort_order' => $i])->id,
            ]);
            $services = collect($data['services'] ?? [])->mapWithKeys(function (array $s, int $i) use (&$categories) {
                $category = $s['category'] ?? null;
                if ($category !== null && ! $categories->has($category)) {
                    $categories->put($category, ServiceCategory::create(['name' => $category, 'sort_order' => $categories->count()])->id);
                }

                return [$s['name'] => Service::create([
                    ...Arr::only($s, self::SERVICE_FIELDS),
                    'service_category_id' => $category !== null ? $categories->get($category) : null,
                    'sort_order' => $i,
                ])->id];
            });

            $staff = collect($data['staff'] ?? [])->map(function (array $m, int $i) use ($services) {
                $member = StaffMember::create([...Arr::only($m, self::STAFF_FIELDS), 'sort_order' => $i]);
                $member->workingHours()->createMany(collect($m['working_hours'] ?? [])->map(fn ($h) => Arr::only($h, ['weekday', 'week', 'starts_at', 'ends_at']))->all());
                $member->services()->sync($services->only($m['services'] ?? [])->values());

                return $member;
            });

            foreach ($data['promotions'] ?? [] as $p) {
                Promotion::create(Arr::only($p, self::PROMOTION_FIELDS))->services()->sync($services->only($p['services'] ?? [])->values());
            }

            $kept ??= collect();
            foreach ($kept as $attributes) {
                DB::table('users')->insert([...$attributes, 'staff_member_id' => null, 'favorite_staff_member_id' => null]);
            }

            $accounts = $kept->count();
            foreach ($data['accounts'] ?? [] as $a) {
                $member = isset($a['staff']) ? $staff->get($a['staff']) : null;
                $existing = filled($a['email'] ?? null) ? User::where('email', $a['email'])->first() : null;
                if ($existing) {
                    $existing->forceFill([...Arr::only($a, ['first_name', 'last_name']), 'staff_member_id' => $member?->id])->save();

                    continue;
                }
                $user = new User(Arr::only($a, ['first_name', 'last_name', 'email', 'phone']));
                $user->forceFill([
                    'role' => $a['role'] ?? User::ROLE_WORKER,
                    'password' => Hash::make($a['password'] ?? $password ?? Str::random(40)),
                    'email_verified_at' => now(),
                    'staff_member_id' => $member?->id,
                ])->save();
                $accounts++;
            }

            foreach ($staff as $member) {
                if (filled($member->email) && ! User::where('staff_member_id', $member->id)->exists()) {
                    app(StaffAccountService::class)->sync($member);
                    $accounts++;
                }
            }

            $free = $staff->filter(fn (StaffMember $m) => ! User::where('staff_member_id', $m->id)->exists())->values();
            foreach ($kept as $attributes) {
                $user = User::find($attributes['id']);
                if ($attributes['staff_member_id'] === null || $user->staff_member_id !== null) {
                    continue;
                }
                $member = $free->shift();
                if ($member) {
                    $user->forceFill(['staff_member_id' => $member->id, 'first_name' => $member->first_name, 'last_name' => $member->last_name])->save();
                } elseif ($user->role === User::ROLE_WORKER) {
                    $user->delete();
                    $accounts--;
                }
            }

            return [...$this->counts($data), 'accounts' => $accounts];
        });
    }

    private function counts(array $data): array
    {
        return collect(['categories', 'services', 'staff', 'promotions', 'accounts'])
            ->mapWithKeys(fn ($key) => [$key => count($data[$key] ?? [])])
            ->all();
    }

    private function time(?string $value): ?string
    {
        return $value === null ? null : substr($value, 0, 5);
    }

    private function writeImage(string $dir, string $name, ?string $dataUrl): void
    {
        foreach (File::glob($dir.'/'.$name.'.*') as $old) {
            File::delete($old);
        }
        if (! $dataUrl || ! preg_match('#^data:image/([a-z+]+);base64,(.+)$#', $dataUrl, $match)) {
            return;
        }
        $extension = ['jpeg' => 'jpg', 'svg+xml' => 'svg'][$match[1]] ?? $match[1];
        File::put("{$dir}/{$name}.{$extension}", base64_decode($match[2]));
    }

    private function readImage(string $dir, string $name): ?string
    {
        $types = ['png' => 'image/png', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'webp' => 'image/webp', 'svg' => 'image/svg+xml'];
        foreach ($types as $extension => $mime) {
            $path = "{$dir}/{$name}.{$extension}";
            if (File::exists($path)) {
                return 'data:'.$mime.';base64,'.base64_encode(File::get($path));
            }
        }

        return null;
    }
}
