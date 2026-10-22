import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { COMMUNICATION_OPTIONS, CommunicationChannel, GENDER_OPTIONS, Gender } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { apiErrorMessage } from '../../core/utils/api-error';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { ButtonDirective } from '../../shared/directives/button.directive';
import { IconDirective } from '../../shared/directives/icon.directive';
import { InputDirective } from '../../shared/directives/input.directive';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, ButtonDirective, ErrorMessageComponent, IconDirective, InputDirective],
  templateUrl: './profile.component.html',
})
export class ProfileComponent {
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  protected auth = inject(AuthService);

  readonly communication = COMMUNICATION_OPTIONS;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly resending = signal(false);
  readonly passwordOpen = signal(false);
  readonly passwordSaving = signal(false);
  readonly passwordError = signal<string | null>(null);

  readonly passwordForm = this.fb.nonNullable.group({
    current_password: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(8)]],
    password_confirmation: ['', Validators.required],
  });
  readonly initials = computed(() => {
    const user = this.auth.currentUser();
    return user ? `${user.first_name[0] ?? ''}${user.last_name[0] ?? ''}`.toUpperCase() : '';
  });

  readonly genders = GENDER_OPTIONS;

  readonly form = this.fb.nonNullable.group({
    first_name: ['', [Validators.required, Validators.minLength(2)]],
    last_name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', Validators.required],
    whatsapp_number: [''],
    preferred_communication: ['email' as CommunicationChannel],
    gender: [null as Gender | null],
  });

  constructor() {
    this.auth.loadMe().subscribe({ error: () => undefined });
    const user = this.auth.currentUser();
    if (user) {
      this.form.reset({
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone ?? '',
        whatsapp_number: user.whatsapp_number ?? '',
        preferred_communication: user.preferred_communication,
        gender: user.gender ?? null,
      });
    }
  }

  resendVerification(): void {
    const email = this.auth.currentUser()?.email;
    if (!email) return;
    this.resending.set(true);
    this.auth.resendVerification(email).subscribe({
      next: (res) => {
        this.resending.set(false);
        this.toast.success(res.message);
      },
      error: (err) => {
        this.resending.set(false);
        this.toast.error(apiErrorMessage(err, 'Slanje nije uspelo.'));
      },
    });
  }

  changePassword(): void {
    const value = this.passwordForm.getRawValue();
    if (this.passwordForm.invalid || value.password !== value.password_confirmation) {
      this.passwordError.set(value.password.length < 8 ? 'Nova lozinka mora imati bar 8 karaktera.' : 'Nove lozinke se ne poklapaju.');
      return;
    }

    this.passwordSaving.set(true);
    this.passwordError.set(null);
    this.auth.changePassword(value).subscribe({
      next: (res) => {
        this.passwordSaving.set(false);
        this.toast.success(res.message);
        this.auth.clearSession('/login');
      },
      error: (err) => {
        this.passwordSaving.set(false);
        this.passwordError.set(apiErrorMessage(err, 'Promena lozinke nije uspela.'));
      },
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);
    this.auth.updateProfile({ ...value, whatsapp_number: value.whatsapp_number.trim() || null }).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Profil je sačuvan.');
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(err, 'Čuvanje nije uspelo.'));
      },
    });
  }
}
