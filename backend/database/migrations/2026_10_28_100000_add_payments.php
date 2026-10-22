<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('business_settings', function (Blueprint $table) {
            $table->string('bank_account', 30)->nullable();
            $table->string('payee_name')->nullable();
            $table->string('payee_address')->nullable();
            $table->string('payment_code', 3)->default('289');
            $table->boolean('online_payment_enabled')->default(false);
        });

        Schema::table('appointments', function (Blueprint $table) {
            $table->timestamp('paid_at')->nullable()->after('cancelled_by');
            $table->string('payment_method', 10)->nullable()->after('paid_at');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn(['paid_at', 'payment_method']);
        });

        Schema::table('business_settings', function (Blueprint $table) {
            $table->dropColumn(['bank_account', 'payee_name', 'payee_address', 'payment_code', 'online_payment_enabled']);
        });
    }
};
