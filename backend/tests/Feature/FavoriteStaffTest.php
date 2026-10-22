<?php

namespace Tests\Feature;

use App\Models\StaffMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FavoriteStaffTest extends TestCase
{
    use RefreshDatabase;

    public function test_client_sets_and_clears_favorite_stylist(): void
    {
        $client = User::factory()->create();
        $marko = StaffMember::create(['first_name' => 'Marko', 'last_name' => 'Matović']);
        $gone = StaffMember::create(['first_name' => 'Bivši', 'last_name' => 'Radnik', 'active' => false]);

        $this->actingAsJwt($client)->putJson('/api/auth/favorite-staff', ['staff_member_id' => $marko->id])
            ->assertOk()
            ->assertJsonPath('favorite_staff_member_id', $marko->id);

        $this->actingAsJwt($client)->putJson('/api/auth/favorite-staff', ['staff_member_id' => $gone->id])->assertUnprocessable();

        $this->actingAsJwt($client)->putJson('/api/auth/profile', [
            'first_name' => 'Petar',
            'last_name' => 'Petrović',
            'phone' => '060 123 4567',
            'preferred_communication' => 'email',
        ])->assertOk()->assertJsonPath('favorite_staff_member_id', $marko->id);

        $this->actingAsJwt($client)->putJson('/api/auth/favorite-staff', ['staff_member_id' => null])
            ->assertOk()
            ->assertJsonPath('favorite_staff_member_id', null);
    }

    public function test_deleting_stylist_clears_favorite(): void
    {
        $marko = StaffMember::create(['first_name' => 'Marko', 'last_name' => 'Matović']);
        $client = User::factory()->create(['favorite_staff_member_id' => $marko->id]);

        $marko->delete();

        $this->assertNull($client->fresh()->favorite_staff_member_id);
    }
}
