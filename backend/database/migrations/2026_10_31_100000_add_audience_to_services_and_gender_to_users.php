<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->string('audience', 10)->default('all')->after('category');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('gender', 10)->nullable()->after('last_name');
        });

        DB::table('services')->where(fn ($q) => $q->where('name', 'like', 'Žensk%')->orWhere('name', 'like', '%žensk%'))->update(['audience' => 'female']);
        DB::table('services')->where(fn ($q) => $q->where('name', 'like', 'Mušk%')->orWhere('name', 'like', '%mušk%'))->update(['audience' => 'male']);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('gender');
        });

        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn('audience');
        });
    }
};
