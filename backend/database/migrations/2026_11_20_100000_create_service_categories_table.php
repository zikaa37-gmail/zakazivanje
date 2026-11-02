<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('service_categories')) {
            DB::statement('ALTER TABLE '.DB::getTablePrefix().'service_categories ENGINE = InnoDB');
        } else {
            Schema::create('service_categories', function (Blueprint $table) {
                $table->engine('InnoDB');
                $table->id();
                $table->string('name', 100)->unique();
                $table->unsignedInteger('sort_order')->default(0);
                $table->boolean('active')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasColumn('services', 'service_category_id')) {
            Schema::table('services', function (Blueprint $table) {
                $table->unsignedBigInteger('service_category_id')->nullable()->after('description');
            });
        }

        Schema::table('services', function (Blueprint $table) {
            $table->foreign('service_category_id')->references('id')->on('service_categories')->nullOnDelete();
        });

        if (! Schema::hasColumn('services', 'category')) {
            return;
        }

        $names = DB::table('services')
            ->whereNotNull('category')
            ->where('category', '<>', '')
            ->selectRaw('TRIM(category) as name, MIN(sort_order) as first_order, MIN(id) as first_id')
            ->groupByRaw('TRIM(category)')
            ->orderBy('first_order')
            ->orderBy('first_id')
            ->pluck('name');

        foreach ($names->values() as $i => $name) {
            $id = DB::table('service_categories')->where('name', $name)->value('id')
                ?? DB::table('service_categories')->insertGetId(['name' => $name, 'sort_order' => $i, 'active' => true, 'created_at' => now(), 'updated_at' => now()]);
            DB::table('services')->whereRaw('TRIM(category) = ?', [$name])->update(['service_category_id' => $id]);
        }

        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn('category');
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->string('category', 100)->nullable()->after('description');
        });

        foreach (DB::table('service_categories')->get() as $category) {
            DB::table('services')->where('service_category_id', $category->id)->update(['category' => $category->name]);
        }

        Schema::table('services', function (Blueprint $table) {
            $table->dropConstrainedForeignId('service_category_id');
        });

        Schema::dropIfExists('service_categories');
    }
};
