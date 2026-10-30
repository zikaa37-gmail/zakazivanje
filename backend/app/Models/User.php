<?php

namespace App\Models;

use App\Notifications\ResetPasswordNotification;
use App\Notifications\VerifyEmailNotification;
use App\Services\WhatsAppService;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Appends;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;

#[Fillable(['first_name', 'last_name', 'gender', 'favorite_staff_member_id', 'staff_member_id', 'email', 'phone', 'whatsapp_number', 'avatar', 'role', 'preferred_communication', 'active', 'password'])]
#[Hidden(['password', 'remember_token', 'email_verification_token', ...self::DISCIPLINE_FIELDS])]
#[Appends(['suspended'])]
class User extends Authenticatable
{
    public const GENDER_FEMALE = 'female';

    public const GENDER_MALE = 'male';

    public const GENDERS = [self::GENDER_FEMALE, self::GENDER_MALE];

    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    public const ROLE_CLIENT = 'client';

    public const ROLE_OWNER = 'owner';

    public const ROLE_WORKER = 'worker';

    public const ROLE_MANAGER = 'manager';

    public const ROLES = [self::ROLE_CLIENT, self::ROLE_OWNER, self::ROLE_MANAGER, self::ROLE_WORKER];

    public const STAFF_ROLES = [self::ROLE_OWNER, self::ROLE_MANAGER, self::ROLE_WORKER];

    public const COMMUNICATION_CHANNELS = ['email', 'whatsapp', 'both'];

    public const ZONE_GREEN = 'green';

    public const ZONE_YELLOW = 'yellow';

    public const ZONE_ORANGE = 'orange';

    public const ZONE_RED = 'red';

    public const ZONES = [self::ZONE_GREEN, self::ZONE_YELLOW, self::ZONE_ORANGE, self::ZONE_RED];

    public const DISCIPLINE_FIELDS = ['discipline_zone', 'discipline_points', 'zone_manual', 'zone_until', 'zone_reason', 'zone_changed_at'];

    protected function casts(): array
    {
        return [
            'favorite_staff_member_id' => 'integer',
            'staff_member_id' => 'integer',
            'discipline_points' => 'float',
            'zone_manual' => 'boolean',
            'zone_until' => 'date:Y-m-d',
            'zone_changed_at' => 'datetime',
            'email_verified_at' => 'datetime',
            'email_verification_sent_at' => 'datetime',
            'last_login_at' => 'datetime',
            'active' => 'boolean',
            'password' => 'hashed',
        ];
    }

    public function refreshTokens(): HasMany
    {
        return $this->hasMany(RefreshToken::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class, 'client_id');
    }

    public function notificationChannels(array $map): array
    {
        $hasEmail = filled($this->email);
        $hasPhone = WhatsAppService::normalizePhone($this->whatsapp_number ?: $this->phone) !== null;
        $preference = $this->preferred_communication ?? 'email';
        $wantsEmail = in_array($preference, ['email', 'both'], true);
        $wantsWhatsApp = in_array($preference, ['whatsapp', 'both'], true);

        $channels = [];
        if ($hasEmail && ($wantsEmail || ! $hasPhone)) {
            $channels[] = $map['mail'];
        }
        if ($hasPhone && ($wantsWhatsApp || ! $hasEmail)) {
            $channels[] = $map['whatsapp'];
        }

        return $channels;
    }

    public function staffMember(): BelongsTo
    {
        return $this->belongsTo(StaffMember::class);
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(ClientActivityLog::class);
    }

    public function isSuspended(): bool
    {
        return $this->role === self::ROLE_CLIENT && $this->discipline_zone === self::ZONE_RED;
    }

    protected function suspended(): Attribute
    {
        return Attribute::get(fn () => $this->isSuspended());
    }

    public function isOwner(): bool
    {
        return $this->role === self::ROLE_OWNER;
    }

    public function isManager(): bool
    {
        return $this->isOwner() || $this->isOfficeWorker();
    }

    public function isOfficeWorker(): bool
    {
        return $this->role === self::ROLE_MANAGER;
    }

    public function isServiceWorker(): bool
    {
        return $this->role === self::ROLE_WORKER;
    }

    public function isStaff(): bool
    {
        return in_array($this->role, self::STAFF_ROLES, true);
    }

    public function fullName(): string
    {
        return trim($this->first_name.' '.$this->last_name);
    }

    public const VERIFICATION_DAYS = 3;

    public function sendEmailVerification(?string $next = null): void
    {
        $token = Str::random(64);
        $this->forceFill(['email_verification_token' => hash('sha256', $token), 'email_verification_sent_at' => now()])->save();
        $this->notify(new VerifyEmailNotification($token, $next));
    }

    public function verificationExpired(): bool
    {
        return $this->email_verification_sent_at === null || $this->email_verification_sent_at->lt(now()->subDays(self::VERIFICATION_DAYS));
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }
}
