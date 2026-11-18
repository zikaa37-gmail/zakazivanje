<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('gift_cards', function (Blueprint $table) {
            $table->string('kind', 10)->default('physical')->after('code');
            $table->string('card_number', 30)->nullable()->after('kind');
            $table->decimal('balance', 10, 2)->default(0)->after('amount');
            $table->foreignId('owner_id')->nullable()->after('recipient_name')->constrained('users')->nullOnDelete();
        });
        DB::table('gift_cards')->update(['balance' => DB::raw('amount'), 'owner_id' => DB::raw('redeemed_by')]);
        DB::table('gift_cards')->whereNotNull('redeemed_at')->update(['balance' => 0]);
        Schema::table('gift_cards', function (Blueprint $table) {
            $table->dropConstrainedForeignId('redeemed_by');
            $table->dropColumn('redeemed_at');
        });

        Schema::table('appointment_payments', function (Blueprint $table) {
            $table->foreignId('gift_card_id')->nullable()->after('method')->constrained('gift_cards')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('appointment_payments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('gift_card_id');
        });
        Schema::table('gift_cards', function (Blueprint $table) {
            $table->foreignId('redeemed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('redeemed_at')->nullable();
            $table->dropConstrainedForeignId('owner_id');
            $table->dropColumn(['kind', 'card_number', 'balance']);
        });
    }
};
