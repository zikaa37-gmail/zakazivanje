<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->string('service_outcome', 10)->nullable()->after('status');
            $table->decimal('due_amount', 10, 2)->nullable()->after('total');
            $table->decimal('paid_amount', 10, 2)->nullable()->after('due_amount');
        });
        DB::table('appointments')->where('status', 'completed')->update(['service_outcome' => 'done']);
        DB::table('appointments')->whereNotNull('paid_at')->update(['paid_amount' => DB::raw('total')]);
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn(['service_outcome', 'due_amount', 'paid_amount']);
        });
    }
};
