<?php

namespace App\Models;

use App\Notifications\ResetPasswordNotification;
use App\Notifications\VerifyEmailNotification;
use App\Services\WhatsAppService;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;

#[Fillable(['first_name', 'last_name', 'gender', 'email', 'phone', 'whatsapp_number', 'avatar', 'role', 'preferred_communication', 'active', 'password'])]
#[Hidden(['password', 'remember_token', 'email_verification_token'])]
class User extends Authenticatable
{
    public const GENDER_FEMALE = 'female';

    public const GENDER_MALE = 'male';

    public const GENDERS = [self::GENDER_FEMALE, self::GENDER_MALE];

    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    public const ROLE_CLIENT = 'client';

    public const ROLE_ADMIN = 'admin';

    public const ROLES = [self::ROLE_CLIENT, self::ROLE_ADMIN];

    public const COMMUNICATION_CHANNELS = ['email', 'whatsapp', 'both'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
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

    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    public function fullName(): string
    {
        return trim($this->first_name.' '.$this->last_name);
    }

    public function sendEmailVerification(): void
    {
        $token = Str::random(64);
        $this->forceFill(['email_verification_token' => hash('sha256', $token)])->save();
        $this->notify(new VerifyEmailNotification($token));
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }
}
