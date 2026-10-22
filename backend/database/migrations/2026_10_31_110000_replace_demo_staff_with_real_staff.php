<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const STAFF = [
        ['from' => ['Ana', 'Jovanović'], 'first_name' => 'Jelena', 'last_name' => 'Matović', 'title' => 'Frizer (muški i ženski)', 'services' => ['Žensko šišanje', 'Muško šišanje', 'Feniranje', 'Farbanje']],
        ['from' => ['Milica', 'Petrović'], 'first_name' => 'Marko', 'last_name' => 'Matović', 'title' => 'Muški frizer', 'services' => ['Muško šišanje']],
        ['from' => ['Jelena', 'Ilić'], 'first_name' => 'Sandra', 'last_name' => 'Afrika', 'title' => 'Ženski frizer', 'services' => ['Žensko šišanje', 'Feniranje', 'Farbanje']],
    ];

    public function up(): void
    {
        $services = DB::table('services')->pluck('id', 'name');

        foreach (self::STAFF as $staff) {
            $id = DB::table('staff_members')->where('first_name', $staff['from'][0])->where('last_name', $staff['from'][1])->value('id');
            if (! $id) {
                continue;
            }

            DB::table('staff_members')->where('id', $id)->update([
                'first_name' => $staff['first_name'],
                'last_name' => $staff['last_name'],
                'title' => $staff['title'],
                'updated_at' => now(),
            ]);

            DB::table('service_staff_member')->where('staff_member_id', $id)->delete();
            DB::table('service_staff_member')->insert(
                collect($staff['services'])->filter(fn ($name) => $services->has($name))->map(fn ($name) => ['service_id' => $services[$name], 'staff_member_id' => $id])->values()->all(),
            );
        }

        DB::table('services')
            ->where('active', true)
            ->whereNotExists(fn ($q) => $q->select(DB::raw(1))->from('service_staff_member')->whereColumn('service_staff_member.service_id', 'services.id'))
            ->update(['active' => false, 'updated_at' => now()]);
    }

    public function down(): void {}
};
