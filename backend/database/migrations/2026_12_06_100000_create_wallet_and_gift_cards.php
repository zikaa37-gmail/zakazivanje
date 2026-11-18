<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gift_cards', function (Blueprint $table) {
            $table->id();
            $table->string('code', 16)->unique();
            $table->decimal('amount', 10, 2);
            $table->string('buyer_name', 150)->nullable();
            $table->string('recipient_name', 150)->nullable();
            $table->string('note', 500)->nullable();
            $table->string('payment_method', 10);
            $table->date('expires_on')->nullable();
            $table->foreignId('sold_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('redeemed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('redeemed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
        });

        Schema::create('wallet_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('amount', 10, 2);
            $table->string('kind', 20);
            $table->string('payment_method', 10)->nullable();
            $table->foreignId('appointment_id')->nullable()->constrained('appointments')->nullOnDelete();
            $table->foreignId('gift_card_id')->nullable()->constrained('gift_cards')->nullOnDelete();
            $table->string('note', 500)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['user_id', 'id']);
        });

        Schema::create('appointment_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('appointment_id')->constrained('appointments')->cascadeOnDelete();
            $table->decimal('amount', 10, 2);
            $table->string('method', 10);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        DB::table('appointments')->whereNotNull('paid_at')->orderBy('id')->each(function ($a) {
            DB::table('appointment_payments')->insert([
                'appointment_id' => $a->id,
                'amount' => $a->paid_amount ?? $a->total,
                'method' => $a->payment_method ?? 'cash',
                'created_at' => $a->paid_at,
                'updated_at' => $a->paid_at,
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointment_payments');
        Schema::dropIfExists('wallet_entries');
        Schema::dropIfExists('gift_cards');
    }
};
