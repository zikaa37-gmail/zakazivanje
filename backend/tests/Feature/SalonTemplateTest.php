<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Models\OpeningHour;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\StaffMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SalonTemplateTest extends TestCase
{
    use RefreshDatabase;

    private string $dir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->dir = storage_path('framework/testing/salon-template');
        File::deleteDirectory($this->dir);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->dir);
        parent::tearDown();
    }

    public function test_export_then_load_recreates_the_salon_and_wipes_everything_else(): void
    {
        BusinessSetting::current()->update(['name' => 'Salon A', 'phone' => '011 123', 'logo' => 'data:image/png;base64,'.base64_encode('png-bytes')]);
        OpeningHour::updateOrCreate(['weekday' => 1], ['opens_at' => '09:00', 'closes_at' => '17:00']);
        $category = ServiceCategory::create(['name' => 'Nokti', 'active' => false]);
        $service = Service::create(['name' => 'Manikir', 'duration_minutes' => 45, 'price' => 1500, 'service_category_id' => $category->id]);
        $member = StaffMember::create(['first_name' => 'Ana', 'last_name' => 'A', 'email' => 'ana@salon.test', 'color' => '#c2185b']);
        $member->workingHours()->create(['weekday' => 1, 'week' => 1, 'starts_at' => '09:00', 'ends_at' => '17:00']);
        $member->services()->sync([$service->id]);
        User::factory()->create(['role' => User::ROLE_OWNER, 'email' => 'vlasnik@salon.test', 'first_name' => 'Vlasnica']);
        User::factory()->create(['role' => User::ROLE_WORKER, 'email' => 'ana@salon.test', 'staff_member_id' => $member->id]);
        $client = User::factory()->create();
        Appointment::create(['client_id' => $client->id, 'staff_member_id' => $member->id, 'starts_at' => now()->addDay(), 'ends_at' => now()->addDay()->addHour(), 'status' => 'confirmed', 'price' => 1500]);

        $this->artisan('salon:export', ['slug' => 'x'])->assertSuccessful();
        File::moveDirectory(database_path('data/salons/x'), $this->dir);
        $this->assertFileExists($this->dir.'/logo.png');

        $quick = User::factory()->create(['role' => User::ROLE_WORKER, 'email' => 'brza@test.rs', 'password' => Hash::make('tajna'), 'staff_member_id' => StaffMember::create(['first_name' => 'Q', 'last_name' => 'Q'])->id]);
        $gone = User::factory()->create(['role' => User::ROLE_WORKER, 'email' => 'visak@test.rs', 'staff_member_id' => StaffMember::create(['first_name' => 'V', 'last_name' => 'V'])->id]);
        $demo = User::factory()->create(['email' => 'demo1@demo.zakazivanje.rs']);
        config(['auth_jwt.quick_login_emails' => ['brza@test.rs']]);
        $service = app(\App\Services\SalonTemplateService::class);
        $kept = $service->keptUsers(['brza@test.rs', 'visak@test.rs'], true);
        StaffMember::create(['first_name' => 'Slobodna', 'last_name' => 'B']);
        $service->wipe();
        $this->assertSame(0, User::count());
        $this->assertSame(0, Appointment::count());

        $data = json_decode(File::get($this->dir.'/salon.json'), true);
        $data['staff'][] = ['first_name' => 'Mila', 'last_name' => 'M', 'color' => '#000000', 'working_hours' => [], 'services' => ['Manikir']];
        File::put($this->dir.'/salon.json', json_encode($data));

        $service->load($this->dir, 'nova', $kept);

        $this->assertSame('Salon A', BusinessSetting::current()->name);
        $this->assertStringStartsWith('data:image/png;base64,', BusinessSetting::current()->logo);
        $this->assertSame('17:00', OpeningHour::where('weekday', 1)->first()->closes_at);
        $this->assertFalse((bool) ServiceCategory::where('name', 'Nokti')->first()->active);
        $ana = StaffMember::where('first_name', 'Ana')->first();
        $this->assertSame(['Manikir'], $ana->services->pluck('name')->all());
        $this->assertSame(1, $ana->workingHours()->count());
        $this->assertTrue(Hash::check('nova', User::where('email', 'vlasnik@salon.test')->first()->password));
        $this->assertSame($ana->id, User::where('email', 'ana@salon.test')->first()->staff_member_id);
        $kept = User::where('email', 'brza@test.rs')->first();
        $this->assertTrue(Hash::check('tajna', $kept->password));
        $this->assertSame(StaffMember::where('first_name', 'Mila')->value('id'), $kept->staff_member_id);
        $this->assertSame(0, Appointment::count());
        $this->assertSame($client->email, User::find($client->id)?->email);
        $this->assertNull(User::where('email', 'visak@test.rs')->first());
        $this->assertNull(User::where('email', 'demo1@demo.zakazivanje.rs')->first());
        $this->assertSame(4, User::count());
    }

    public function test_bundled_templates_load(): void
    {
        foreach (['pink', 'pink-starss'] as $slug) {
            $this->artisan('salon:load', ['slug' => $slug, '--force' => true, '--password' => 'x'])->assertSuccessful();
            $this->assertNotNull(BusinessSetting::current()->logo);
        }
        $this->assertSame('Pink Starss', BusinessSetting::current()->name);
        $this->assertFalse((bool) ServiceCategory::where('name', 'Frizer — boja')->value('active'));
        $this->assertSame(7, OpeningHour::count());
    }
}
