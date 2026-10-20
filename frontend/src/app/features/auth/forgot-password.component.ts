import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { BusinessSettingService } from '../../core/services/business-setting.service';
import { apiErrorMessage } from '../../core/utils/api-error';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { IconDirective } from '../../shared/directives/icon.directive';
import { InputDirective } from '../../shared/directives/input.directive';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, ErrorMessageComponent, IconDirective, InputDirective],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <span class="auth-logo-placeholder"><span appIcon="lock" [iconSize]="32"></span></span>
        <h1 class="text-2xl font-bold">Zaboravljena lozinka</h1>
        @if (done(); as message) {
          <p class="muted" data-testid="forgot-done">{{ message }}</p>
        } @else {
          <p class="muted mb-6">Poslaćemo ti link za novu lozinku.</p>
          <app-error-message [message]="error()" />
          <form (submit)="$event.preventDefault(); submit()" novalidate>
            <div class="field">
              <label for="f-email">Email</label>
              <input id="f-email" appInput size="m" type="email" autocomplete="email" [formControl]="email" data-testid="forgot-email" />
            </div>
            <app-button type="submit" size="l" [block]="true" [loading]="loading()" data-testid="forgot-submit">Pošalji link</app-button>
          </form>
        }
        <a routerLink="/login" class="auth-link">Nazad na prijavu</a>
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private auth = inject(AuthService);
  protected business = inject(BusinessSettingService);

  readonly email = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] });
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly done = signal<string | null>(null);

  submit(): void {
    if (this.email.invalid) {
      this.error.set('Unesi ispravan email.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.auth.forgotPassword(this.email.value.trim()).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.done.set(res.message);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, 'Slanje nije uspelo.'));
      },
    });
  }
}
