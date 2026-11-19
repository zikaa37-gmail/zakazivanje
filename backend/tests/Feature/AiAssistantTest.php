<?php

namespace Tests\Feature;

use App\Models\BusinessSetting;
use App\Models\User;
use App\Services\AiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class AiAssistantTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.anthropic.key' => null]);
        $this->owner = User::factory()->create(['role' => User::ROLE_OWNER]);
    }

    public function test_ai_is_off_without_key_and_cannot_be_enabled(): void
    {
        $this->actingAsJwt($this->owner)->getJson('/api/ai/status')->assertOk()
            ->assertJsonPath('enabled', false)->assertJsonPath('available', false);

        $settings = BusinessSetting::current();
        $this->actingAsJwt($this->owner)->putJson('/api/business-settings', [
            'name' => $settings->name, 'category' => $settings->category, 'booking_confirmation' => 'manual', 'ai_enabled' => true,
        ])->assertUnprocessable()->assertJsonValidationErrors('ai_enabled');

        $this->actingAsJwt($this->owner)->postJson('/api/ai/service-suggestions', [])
            ->assertUnprocessable()->assertJsonValidationErrors('ai');
    }

    public function test_saved_key_is_verified_encrypted_and_never_returned(): void
    {
        $ai = Mockery::mock(AiService::class)->makePartial();
        $ai->shouldReceive('verify')->once()->with('sk-ant-test-0123456789abcdef');
        $this->app->instance(AiService::class, $ai);

        $this->actingAsJwt($this->owner)->putJson('/api/ai/key', ['api_key' => 'sk-ant-test-0123456789abcdef'])
            ->assertOk()->assertJsonPath('key_saved', true);

        $raw = BusinessSetting::query()->toBase()->value('ai_api_key');
        $this->assertNotSame('sk-ant-test-0123456789abcdef', $raw);
        $this->assertSame('sk-ant-test-0123456789abcdef', BusinessSetting::current()->ai_api_key);

        $settings = BusinessSetting::current();
        $this->actingAsJwt($this->owner)->putJson('/api/business-settings', [
            'name' => $settings->name, 'category' => $settings->category, 'booking_confirmation' => 'manual', 'ai_enabled' => true,
        ])->assertOk()->assertJsonPath('ai_available', true)->assertJsonMissingPath('ai_api_key');

        $this->app['auth']->forgetGuards();
        $this->withoutToken()->getJson('/api/public/business')->assertOk()->assertJsonMissingPath('ai_enabled')->assertJsonMissingPath('ai_available');

        $this->actingAsJwt($this->owner)->deleteJson('/api/ai/key')->assertOk()->assertJsonPath('available', false);
    }

    public function test_service_suggestions_come_from_ai(): void
    {
        BusinessSetting::current()->update(['ai_enabled' => true, 'ai_api_key' => 'sk-ant-test-0123456789abcdef']);
        $ai = Mockery::mock(AiService::class)->makePartial();
        $ai->shouldReceive('json')->once()->andReturn(['categories' => [
            ['name' => 'Nokti', 'services' => [['name' => 'Gel lak', 'description' => 'Trajni lak.', 'duration_minutes' => 60, 'price' => 2000, 'audience' => 'all']]],
        ]]);
        $this->app->instance(AiService::class, $ai);

        $this->actingAsJwt($this->owner)->postJson('/api/ai/service-suggestions', ['description' => 'radimo nokte'])
            ->assertOk()->assertJsonPath('categories.0.services.0.name', 'Gel lak');
    }

    public function test_staff_term_is_saved_and_public(): void
    {
        $settings = BusinessSetting::current();
        $this->actingAsJwt($this->owner)->putJson('/api/business-settings', [
            'name' => $settings->name, 'category' => 'massage', 'booking_confirmation' => 'manual',
            'staff_term' => 'maser',
        ])->assertUnprocessable()->assertJsonValidationErrors('staff_term_genitive');

        $this->actingAsJwt($this->owner)->putJson('/api/business-settings', [
            'name' => $settings->name, 'category' => 'massage', 'booking_confirmation' => 'manual',
            'staff_term' => 'maser', 'staff_term_genitive' => 'masera',
        ])->assertOk();

        $this->getJson('/api/public/business')->assertJsonPath('staff_term', 'maser')->assertJsonPath('staff_term_genitive', 'masera');
    }
}
