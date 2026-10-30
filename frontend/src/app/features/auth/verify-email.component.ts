import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { apiErrorMessage } from '../../core/utils/api-error';
import { ToastService } from '../../core/services/toast.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { IconDirective } from '../../shared/directives/icon.directive';
import { InputDirective } from '../../shared/directives/input.directive';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, IconDirective, InputDirective],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        @if (status() === 'loading') {
          <p class="muted">Aktiviramo nalog...</p>
        } @else {
          <span
            class="inline-flex items-center justify-center w-16 h-16 rounded-full mb-3"
            [class]="status() === 'ok' ? 'bg-[var(--color-success-tint)] text-[var(--color-success)]' : 'bg-[var(--color-danger-tint)] text-[var(--color-danger)]'"
          >
            <span [appIcon]="status() === 'ok' ? 'check' : 'alert-triangle'" [iconSize]="30"></span>
          </span>
          <h1 class="text-xl font-bold">{{ status() === 'ok' ? 'Nalog je aktiviran' : 'Aktivacija nije uspela' }}</h1>
          <p class="muted">{{ message() }}</p>
          @if (status() === 'error') {
            <form class="mt-4 text-left" (submit)="$event.preventDefault(); resend()" novalidate>
              <div class="field">
                <label for="v-email">Pošalji novi link na</label>
                <input id="v-email" appInput size="m" type="email" [formControl]="email" placeholder="tvoj@email.rs" data-testid="verify-resend-email" />
              </div>
              <app-button type="submit" [block]="true" [loading]="resending()" data-testid="verify-resend">Pošalji novi link</app-button>
            </form>
          }
          <a routerLink="/login" class="auth-link">Prijavi se</a>
        }
      </div>
    </div>
  `,
})
export class VerifyEmailComponent implements OnInit {
  readonly token = input<string>();
  readonly next = input<string>();
  private router = inject(Router);

  private auth = inject(AuthService);
  private toast = inject(ToastService);

  readonly email = new FormControl(this.auth.currentUser()?.email ?? '', { nonNullable: true, validators: [Validators.required, Validators.email] });
  readonly resending = signal(false);

  readonly status = signal<'loading' | 'ok' | 'error'>('loading');
  readonly message = signal('');

  resend(): void {
    if (this.email.invalid) {
      this.toast.error('Unesi ispravan email.');
      return;
    }
    this.resending.set(true);
    this.auth.resendVerification(this.email.value.trim(), this.safeNext()).subscribe({
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

  ngOnInit(): void {
    const token = this.token();
    if (!token) {
      this.status.set('error');
      this.message.set('Link nije ispravan.');
      return;
    }

    this.auth.verifyEmail(token).subscribe({
      next: (res) => {
        this.status.set('ok');
        this.message.set(res.message);
        if (this.auth.isAuthenticated()) this.router.navigateByUrl(this.safeNext() ?? this.auth.homeUrl(), { replaceUrl: true });
      },
      error: (err) => {
        this.status.set('error');
        this.message.set(apiErrorMessage(err, 'Link je nevažeći ili je već iskorišćen.'));
      },
    });
  }

  private safeNext(): string | null {
    const next = this.next();
    return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
  }
}
