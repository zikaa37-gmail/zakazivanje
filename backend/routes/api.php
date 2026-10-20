<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BusinessSettingController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => ['status' => 'ok']);
Route::get('/public/business', [BusinessSettingController::class, 'show'])->middleware('throttle:60,1');

Route::middleware('throttle:10,1')->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);
    Route::post('/auth/verify-email', [AuthController::class, 'verifyEmail']);
    Route::post('/auth/resend-verification', [AuthController::class, 'resendVerification']);
});

Route::post('/auth/refresh', [AuthController::class, 'refresh']);

Route::middleware('jwt')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::put('/auth/profile', [AuthController::class, 'updateProfile']);
    Route::post('/auth/change-password', [AuthController::class, 'changePassword']);
});

Route::middleware(['jwt', 'role:admin'])->group(function () {
    Route::put('/business-settings', [BusinessSettingController::class, 'update']);
});
