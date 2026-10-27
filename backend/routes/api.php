<?php

use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\AppointmentPaymentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BlockedTimeController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\BusinessSettingController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\GalleryController;
use App\Http\Controllers\Api\MyAppointmentController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PromotionController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\ServiceController;
use App\Http\Controllers\Api\ShareController;
use App\Http\Controllers\Api\StaffMemberController;
use App\Http\Controllers\Api\TeamController;
use App\Http\Controllers\Api\WaitlistController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => ['status' => 'ok']);
Route::get('/public/business', [BusinessSettingController::class, 'show'])->middleware(['jwt.optional', 'throttle:public']);
Route::get('/public/business/cover', [BusinessSettingController::class, 'cover']);
Route::get('/public/services', [ServiceController::class, 'publicIndex'])->middleware('throttle:public');
Route::get('/public/gallery', [GalleryController::class, 'publicIndex'])->middleware('throttle:public');
Route::get('/public/reviews', [ReviewController::class, 'publicIndex'])->middleware('throttle:public');
Route::get('/public/gallery/images/{image}', [GalleryController::class, 'image']);
Route::get('/public/reports/{file}', [ReportController::class, 'file'])->middleware('signed')->name('reports.file');

Route::middleware(['jwt.optional', 'throttle:public'])->group(function () {
    Route::post('/availability/slots', [BookingController::class, 'slots']);
    Route::post('/availability/days', [BookingController::class, 'days']);
    Route::post('/bookings/quote', [BookingController::class, 'quote']);
});
Route::post('/bookings', [BookingController::class, 'store'])->middleware(['jwt.optional', 'throttle:booking']);

Route::middleware('throttle:auth')->group(function () {
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
    Route::put('/auth/favorite-staff', [AuthController::class, 'favoriteStaff']);

    Route::post('/my-waitlist/list', [WaitlistController::class, 'mine']);
    Route::post('/my-waitlist', [WaitlistController::class, 'store'])->middleware('throttle:booking');
    Route::delete('/my-waitlist/{entry}', [WaitlistController::class, 'destroy']);

    Route::post('/my-appointments/list', [MyAppointmentController::class, 'index']);
    Route::post('/my-appointments/{appointment}/cancel', [MyAppointmentController::class, 'cancel']);
    Route::post('/my-appointments/{appointment}/review', [ReviewController::class, 'store'])->middleware('throttle:booking');
    Route::post('/my-appointments/{appointment}/payment', [AppointmentPaymentController::class, 'clientDetails']);
    Route::post('/my-appointments/{appointment}/slip', [AppointmentPaymentController::class, 'clientSlip']);
    Route::post('/my-appointments/{appointment}/reschedule', [MyAppointmentController::class, 'reschedule'])->middleware('throttle:booking');
});

Route::middleware(['jwt', 'role:owner,worker'])->group(function () {
    Route::post('/dashboard/today', [DashboardController::class, 'today']);

    Route::post('/staff/list', [StaffMemberController::class, 'index']);
    Route::post('/services/list', [ServiceController::class, 'index']);
    Route::post('/services/quote', [ServiceController::class, 'quote']);

    Route::post('/waitlist/list', [WaitlistController::class, 'index']);
    Route::delete('/waitlist/{entry}', [WaitlistController::class, 'adminDestroy']);

    Route::post('/clients/list', [ClientController::class, 'index']);
    Route::post('/clients', [ClientController::class, 'store']);
    Route::put('/clients/{client}', [ClientController::class, 'update']);
    Route::post('/clients/{client}/activity', [ClientController::class, 'activity']);

    Route::post('/appointments/list', [AppointmentController::class, 'index']);
    Route::post('/appointments/pending-count', [AppointmentController::class, 'pendingCount']);
    Route::post('/appointments', [AppointmentController::class, 'store']);
    Route::post('/appointments/{appointment}/status', [AppointmentController::class, 'updateStatus']);
    Route::post('/appointments/{appointment}/payment', [AppointmentPaymentController::class, 'details']);
    Route::post('/appointments/{appointment}/slip', [AppointmentPaymentController::class, 'slip']);
    Route::post('/appointments/{appointment}/paid', [AppointmentPaymentController::class, 'markPaid']);
    Route::post('/appointments/{appointment}/cancel', [AppointmentController::class, 'cancel']);
    Route::post('/appointments/{appointment}/reschedule', [AppointmentController::class, 'reschedule']);
    Route::post('/recurrences/list', [AppointmentController::class, 'recurrences']);

    Route::post('/reports', [ReportController::class, 'show']);
    Route::post('/reports/pdf', [ReportController::class, 'pdf']);
    Route::post('/reports/send', [ReportController::class, 'send'])->middleware('throttle:booking');

    Route::post('/blocked-times/list', [BlockedTimeController::class, 'index']);
    Route::post('/blocked-times', [BlockedTimeController::class, 'store']);
    Route::delete('/blocked-times/{blockedTime}', [BlockedTimeController::class, 'destroy']);
});

Route::middleware(['jwt', 'role:owner'])->group(function () {
    Route::put('/business-settings', [BusinessSettingController::class, 'update']);

    Route::post('/dashboard/stats', [DashboardController::class, 'stats']);
    Route::post('/dashboard/demand', [DashboardController::class, 'demand']);

    Route::post('/staff', [StaffMemberController::class, 'store']);
    Route::put('/staff/{staffMember}', [StaffMemberController::class, 'update']);
    Route::post('/staff/{staffMember}/active', [StaffMemberController::class, 'setActive']);

    Route::post('/team/list', [TeamController::class, 'index']);
    Route::post('/team', [TeamController::class, 'store']);
    Route::put('/team/{user}', [TeamController::class, 'update']);
    Route::post('/team/{user}/invite', [TeamController::class, 'invite'])->middleware('throttle:booking');
    Route::delete('/team/{user}', [TeamController::class, 'destroy']);

    Route::post('/services', [ServiceController::class, 'store']);
    Route::put('/services/{service}', [ServiceController::class, 'update']);
    Route::delete('/services/{service}', [ServiceController::class, 'destroy']);

    Route::post('/promotions/list', [PromotionController::class, 'index']);
    Route::post('/promotions', [PromotionController::class, 'store']);
    Route::put('/promotions/{promotion}', [PromotionController::class, 'update']);
    Route::delete('/promotions/{promotion}', [PromotionController::class, 'destroy']);

    Route::post('/reviews/list', [ReviewController::class, 'index']);
    Route::put('/reviews/{review}', [ReviewController::class, 'update']);

    Route::post('/share/qr', [ShareController::class, 'qr']);

    Route::post('/gallery/list', [GalleryController::class, 'index']);
    Route::post('/gallery', [GalleryController::class, 'store']);
    Route::post('/gallery/reorder', [GalleryController::class, 'reorder']);
    Route::put('/gallery/{image}', [GalleryController::class, 'update']);
    Route::delete('/gallery/{image}', [GalleryController::class, 'destroy']);

    Route::delete('/clients/{client}', [ClientController::class, 'destroy']);
    Route::put('/clients/{client}/zone', [ClientController::class, 'zone']);

    Route::post('/notification-logs/list', [NotificationController::class, 'logs']);
    Route::post('/notifications/test', [NotificationController::class, 'test'])->middleware('throttle:booking');
});
