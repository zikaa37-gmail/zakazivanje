<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\ClientActivityLog;
use App\Models\OpeningHour;
use App\Models\Review;
use App\Models\Service;
use App\Models\StaffMember;
use App\Models\User;
use App\Services\ClientDisciplineService;
use App\Services\StaffAccountService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DemoDataSeeder extends Seeder
{
    public const DOMAIN = 'demo.zakazivanje.rs';

    private const FEMALE = ['Ana', 'Milica', 'Jovana', 'Marija', 'Jelena', 'Tamara', 'Ivana', 'Katarina', 'Sara', 'Nina', 'Teodora', 'Dragana', 'Maja', 'Sanja', 'Bojana', 'Mina'];

    private const MALE = ['Marko', 'Nikola', 'Stefan', 'Luka', 'Miloš', 'Đorđe', 'Aleksa', 'Filip', 'Vuk', 'Nemanja', 'Dušan', 'Uroš', 'Petar', 'Lazar'];

    private const LAST = ['Jovanović', 'Petrović', 'Nikolić', 'Marković', 'Đorđević', 'Stojanović', 'Ilić', 'Stanković', 'Pavlović', 'Milošević', 'Popović', 'Kostić', 'Živković', 'Tomić', 'Lukić', 'Savić'];

    private const COMMENTS = [
        5 => ['Odlično kao i uvek!', 'Najbolja frizura do sada, hvala!', 'Profesionalno i brzo.', 'Sve preporuke.', 'Prijatna atmosfera i odlična usluga.'],
        4 => ['Vrlo dobro, samo malo čekanja.', 'Zadovoljna sam, doći ću ponovo.', 'Dobra usluga.'],
        3 => ['Solidno, ali sam očekivao više.', 'Kasnili su 15 minuta.'],
    ];

    public function run(): void
    {
        mt_srand(2026);
        $today = CarbonImmutable::today();

        User::where('email', 'like', '%@'.self::DOMAIN)->get()->each->delete();

        $staff = StaffMember::where('active', true)->with(['workingHours', 'services'])->orderBy('sort_order')->get();
        $services = Service::where('active', true)->get()->keyBy('id');
        if ($staff->isEmpty() || $services->isEmpty()) {
            $this->command?->warn('Nema aktivnih zaposlenih ili usluga — demo podaci nisu napravljeni.');

            return;
        }

        $clients = $this->clients($staff);
        $count = DB::transaction(fn () => $this->appointments($staff, $services, $clients, $today));
        $this->disciplineCases($clients, $today);
        $this->reviews();
        $this->activity($clients);
        $this->linkedWorker($staff->first());

        $discipline = app(ClientDisciplineService::class);
        foreach ($clients as $client) {
            $points = $discipline->points($client);
            $zone = $discipline->zoneFor($points);
            $client->forceFill([
                'discipline_points' => $points,
                'discipline_zone' => $zone,
                'zone_reason' => $zone === User::ZONE_GREEN ? null : "Automatski (poeni: {$points})",
                'zone_changed_at' => $zone === User::ZONE_GREEN ? null : now(),
            ])->save();
        }

        $this->command?->info("Demo klijenata: {$clients->count()}, termina: {$count}. Lozinka demo naloga: test");
    }

    private function clients(Collection $staff): Collection
    {
        $password = Hash::make('test');
        $used = [];

        return collect(range(1, 32))->map(function (int $i) use ($password, $staff, &$used): User {
            $female = $i % 5 !== 0 && $i % 3 !== 0;
            do {
                $first = $this->pick($female ? self::FEMALE : self::MALE);
                $last = $this->pick(self::LAST);
            } while (isset($used[$first.$last]));
            $used[$first.$last] = true;

            $withAccount = $i % 7 !== 0;
            $created = CarbonImmutable::now()->subDays(mt_rand(20, 200))->setTime(mt_rand(8, 21), mt_rand(0, 59));
            $slug = str($first.'.'.$last)->ascii()->lower();

            $user = User::create([
                'first_name' => $first,
                'last_name' => $last,
                'gender' => $female ? User::GENDER_FEMALE : User::GENDER_MALE,
                'email' => "{$slug}@".self::DOMAIN,
                'phone' => sprintf('+381 6%d %03d %04d', mt_rand(0, 9), mt_rand(100, 999), mt_rand(0, 9999)),
                'role' => User::ROLE_CLIENT,
                'password' => $withAccount ? $password : null,
                'preferred_communication' => $this->pick(['email', 'email', 'whatsapp', 'both']),
                'favorite_staff_member_id' => mt_rand(1, 4) === 1 ? $staff->random()->id : null,
                'note' => $i % 9 === 0 ? 'Alergija na amonijak — farba bez amonijaka.' : null,
                'active' => true,
            ]);
            $user->forceFill([
                'email_verified_at' => $withAccount ? $created : null,
                'last_login_at' => $withAccount ? CarbonImmutable::now()->subDays(mt_rand(0, 20)) : null,
                'created_at' => $created,
            ])->save();

            return $user;
        });
    }

    private function appointments(Collection $staff, Collection $services, Collection $clients, CarbonImmutable $today): int
    {
        $openingHours = OpeningHour::week();
        $count = 0;

        for ($offset = -60; $offset <= 21; $offset++) {
            $day = $today->addDays($offset);
            $fill = $offset < 0 ? 0.6 : max(0.12, 0.55 - $offset * 0.02);

            foreach ($staff as $member) {
                foreach ($member->hoursOn($day, $openingHours) as $hours) {
                    $t = $day->setTimeFromTimeString($hours['starts_at']);
                    $end = $day->setTimeFromTimeString($hours['ends_at']);

                    while ($t->lt($end)) {
                        if (mt_rand(1, 100) > $fill * 100) {
                            $t = $t->addMinutes(30);

                            continue;
                        }

                        $client = $clients->random();
                        $offered = $member->services->filter(fn ($s) => isset($services[$s->id]) && $services[$s->id]->suits($client->gender));
                        if ($offered->isEmpty()) {
                            $t = $t->addMinutes(30);

                            continue;
                        }

                        $chosen = collect([$services[$offered->random()->id]]);
                        $extra = $offered->first(fn ($s) => $s->name === 'Feniranje' && $s->id !== $chosen->first()->id);
                        if ($extra && $chosen->first()->name !== 'Muško šišanje' && mt_rand(1, 3) === 1) {
                            $chosen->push($services[$extra->id]);
                        }

                        $duration = $chosen->sum('duration_minutes');
                        $finish = $t->addMinutes($duration);
                        if ($finish->gt($end)) {
                            break;
                        }

                        $this->createAppointment($client, $member, $chosen, $t, $finish);
                        $count++;
                        $t = $finish->addMinutes($this->pick([0, 0, 15, 30]));
                    }
                }
            }
        }

        return $count;
    }

    private function createAppointment(User $client, StaffMember $member, Collection $services, CarbonImmutable $start, CarbonImmutable $end): Appointment
    {
        $past = $end->isPast();
        $roll = mt_rand(1, 100);
        $status = $past
            ? match (true) {
                $roll <= 96 => Appointment::STATUS_COMPLETED,
                $roll <= 97 => Appointment::STATUS_NO_SHOW,
                default => Appointment::STATUS_CANCELLED,
            }
            : match (true) {
                $roll <= 72 => Appointment::STATUS_CONFIRMED,
                $roll <= 94 => Appointment::STATUS_PENDING,
                default => Appointment::STATUS_CANCELLED,
            };

        $online = $client->password !== null && mt_rand(1, 100) <= 70;
        $price = (float) $services->sum('price');
        $discount = mt_rand(1, 100) <= 10 ? round($price * 0.15) : 0;
        $booked = $start->subDays(mt_rand(1, 14))->setTime(mt_rand(8, 22), mt_rand(0, 59));
        $byClient = $status === Appointment::STATUS_CANCELLED && mt_rand(1, 100) <= 40;
        $paid = $status === Appointment::STATUS_COMPLETED && mt_rand(1, 100) <= 90;

        $appointment = Appointment::create([
            'client_id' => $client->id,
            'staff_member_id' => $member->id,
            'starts_at' => $start,
            'ends_at' => $end,
            'status' => $status,
            'source' => $online ? Appointment::SOURCE_ONLINE : Appointment::SOURCE_ADMIN,
            'price' => $price,
            'discount' => $discount,
            'total' => $price - $discount,
            'confirmed_at' => in_array($status, [Appointment::STATUS_CONFIRMED, Appointment::STATUS_COMPLETED, Appointment::STATUS_NO_SHOW], true) ? $booked->addHours(2) : null,
            'cancelled_at' => $status === Appointment::STATUS_CANCELLED ? $start->subHours($byClient ? mt_rand(26, 96) : mt_rand(2, 48)) : null,
            'cancelled_by' => $status === Appointment::STATUS_CANCELLED ? ($byClient ? 'client' : 'admin') : null,
            'paid_at' => $paid ? $end : null,
            'payment_method' => $paid ? $this->pick(['cash', 'cash', 'cash', 'card', 'card', 'bank']) : null,
        ]);
        $appointment->forceFill(['created_at' => $booked, 'updated_at' => $booked])->save();

        $share = $price > 0 ? $discount / $price : 0;
        $appointment->items()->createMany($services->values()->map(fn (Service $s) => [
            'service_id' => $s->id,
            'name' => $s->name,
            'duration_minutes' => $s->duration_minutes,
            'price' => $s->price,
            'discount' => round($s->price * $share),
        ])->all());

        return $appointment;
    }

    private function disciplineCases(Collection $clients, CarbonImmutable $today): void
    {
        $withAccount = $clients->filter(fn (User $c) => $c->password !== null)->values();
        $cases = [
            [$withAccount[0], [Appointment::STATUS_CANCELLED, Appointment::STATUS_CANCELLED, Appointment::STATUS_CANCELLED]],
            [$withAccount[1], [Appointment::STATUS_NO_SHOW, Appointment::STATUS_NO_SHOW]],
            [$withAccount[2], [Appointment::STATUS_NO_SHOW, Appointment::STATUS_CANCELLED]],
        ];

        foreach ($cases as $index => [$client, $statuses]) {
            $past = Appointment::query()
                ->where('status', Appointment::STATUS_COMPLETED)
                ->whereBetween('starts_at', [$today->subDays(40), $today->subDay()])
                ->whereDoesntHave('items', fn ($q) => $q->whereNotIn('service_id', Service::whereIn('audience', [Service::AUDIENCE_ALL, $client->gender])->pluck('id')))
                ->inRandomOrder()
                ->limit(count($statuses))
                ->get();

            foreach ($past->values() as $i => $appointment) {
                $cancelled = $statuses[$i] === Appointment::STATUS_CANCELLED;
                $appointment->update([
                    'client_id' => $client->id,
                    'status' => $statuses[$i],
                    'cancelled_at' => $cancelled ? $appointment->starts_at->subHours($index === 0 ? mt_rand(30, 70) : mt_rand(3, 20)) : null,
                    'cancelled_by' => $cancelled ? 'client' : null,
                    'paid_at' => null,
                    'payment_method' => null,
                ]);
            }
        }
    }

    private function reviews(): void
    {
        Appointment::query()
            ->where('status', Appointment::STATUS_COMPLETED)
            ->whereHas('client', fn ($q) => $q->where('email', 'like', '%@'.self::DOMAIN)->whereNotNull('password'))
            ->doesntHave('review')
            ->inRandomOrder()
            ->limit(45)
            ->get()
            ->each(function (Appointment $a) {
                $rating = $this->pick([5, 5, 5, 5, 4, 4, 3]);
                $review = Review::create([
                    'appointment_id' => $a->id,
                    'client_id' => $a->client_id,
                    'staff_member_id' => $a->staff_member_id,
                    'rating' => $rating,
                    'comment' => mt_rand(1, 4) === 1 ? null : $this->pick(self::COMMENTS[$rating]),
                    'visible' => true,
                ]);
                $review->forceFill(['created_at' => $a->ends_at->addHours(mt_rand(2, 48))])->save();
            });
    }

    private function activity(Collection $clients): void
    {
        $agents = [
            'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Linux; Android 15; SM-S921B) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36',
        ];

        foreach ($clients->filter(fn (User $c) => $c->password !== null) as $client) {
            $agent = $this->pick($agents);
            $ip = '93.86.'.mt_rand(1, 254).'.'.mt_rand(1, 254);
            $rows = [];

            foreach (range(1, mt_rand(3, 10)) as $n) {
                $at = CarbonImmutable::now()->subDays(mt_rand(0, 60))->setTime(mt_rand(7, 23), mt_rand(0, 59));
                $rows[] = ['type' => 'login', 'data' => null, 'created_at' => $at];
                $rows[] = ['type' => 'availability_viewed', 'data' => ['from' => $at->addDay()->toDateString(), 'staff_member_id' => null], 'created_at' => $at->addMinutes(1)];
            }

            Appointment::where('client_id', $client->id)->where('source', Appointment::SOURCE_ONLINE)->get()->each(function (Appointment $a) use (&$rows) {
                $rows[] = ['type' => 'booked', 'data' => ['appointment_id' => $a->id, 'starts_at' => $a->starts_at->format('Y-m-d H:i'), 'status' => $a->status], 'created_at' => $a->created_at];
                if ($a->cancelled_by === 'client') {
                    $rows[] = ['type' => 'cancelled', 'data' => ['appointment_id' => $a->id, 'starts_at' => $a->starts_at->format('Y-m-d H:i'), 'hours_before' => (int) $a->cancelled_at->diffInHours($a->starts_at)], 'created_at' => $a->cancelled_at];
                }
            });

            foreach ($rows as $row) {
                ClientActivityLog::create(['user_id' => $client->id, 'type' => $row['type'], 'data' => $row['data'], 'ip' => $ip, 'user_agent' => $agent])
                    ->forceFill(['created_at' => $row['created_at']])
                    ->save();
            }
        }
    }

    private function linkedWorker(?StaffMember $member): void
    {
        if (! $member || ($member->email && ! str_ends_with($member->email, '@'.self::DOMAIN))) {
            return;
        }

        $member->update(['email' => $member->email ?: str($member->first_name)->ascii()->lower().'@'.self::DOMAIN]);
        $account = app(StaffAccountService::class)->sync($member);
        $account?->forceFill(['password' => Hash::make('radnik2026'), 'email_verified_at' => now()])->save();
    }

    private function pick(array $items): mixed
    {
        return $items[mt_rand(0, count($items) - 1)];
    }
}
