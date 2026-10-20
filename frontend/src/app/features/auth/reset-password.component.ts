import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { apiErrorMessage } from '../../core/utils/api-error';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { IconDirective } from '../../shared/directives/icon.directive';
import { InputDirective } from '../../shared/directives/input.directive';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, ErrorMessageComponent, IconDirective, InputDirective],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <span class="auth-logo-placeholder"><span appIcon="lock" [iconSize]="32"></span></span>
        <h1 class="text-2xl font-bold">Nova lozinka</h1>
        @if (done(); as message) {
          <p class="muted" data-testid="reset-done">{{ message }}</p>
          <a routerLink="/login" class="auth-link">Prijavi se</a>
        } @else if (!token() || !email()) {
          <p class="muted">Link nije ispravan. Zatraži novi.</p>
          <a routerLink="/forgot-password" class="auth-link">Zaboravljena lozinka</a>
        } @else {
          <p class="muted mb-6">{{ email() }}</p>
          <app-error-message [message]="error()" />
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="field">
              <label for="r-pass">Nova lozinka (bar 8 karaktera)</label>
              <input id="r-pass" appInput size="m" type="password" autocomplete="new-password" formControlName="password" data-testid="reset-password" />
            </div>
            <div class="field">
              <label for="r-pass2">Ponovi lozinku</label>
              <input id="r-pass2" appInput size="m" type="password" autocomplete="new-password" formControlName="password_confirmation" data-testid="reset-password-confirmation" />
            </div>
            <app-button type="submit" size="l" [block]="true" [loading]="loading()" data-testid="reset-submit">Sačuvaj lozinku</app-button>
          </form>
        }
      </div>
    </div>
  `,
})
export class ResetPasswordComponent {
  readonly token = input<string>();
  readonly email = input<string>();

  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly done = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    password_confirmation: ['', Validators.required],
  });

  submit(): void {
    const value = this.form.getRawValue();
    if (this.form.invalid || value.password !== value.password_confirmation) {
      this.error.set(value.password.length < 8 ? 'Lozinka mora imati bar 8 karaktera.' : 'Lozinke se ne poklapaju.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.auth.resetPassword({ token: this.token()!, email: this.email()!, ...value }).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.done.set(res.message);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, 'Promena lozinke nije uspela.'));
      },
    });
  }
}
