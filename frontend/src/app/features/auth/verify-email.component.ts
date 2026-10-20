import { Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { apiErrorMessage } from '../../core/utils/api-error';
import { IconDirective } from '../../shared/directives/icon.directive';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [RouterLink, IconDirective],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        @if (status() === 'loading') {
          <p class="muted">Potvrđujemo email...</p>
        } @else {
          <span
            class="inline-flex items-center justify-center w-16 h-16 rounded-full mb-3"
            [class]="status() === 'ok' ? 'bg-[var(--color-success-tint)] text-[var(--color-success)]' : 'bg-[var(--color-danger-tint)] text-[var(--color-danger)]'"
          >
            <span [appIcon]="status() === 'ok' ? 'check' : 'alert-triangle'" [iconSize]="30"></span>
          </span>
          <h1 class="text-xl font-bold">{{ status() === 'ok' ? 'Email je potvrđen' : 'Potvrda nije uspela' }}</h1>
          <p class="muted">{{ message() }}</p>
          <a routerLink="/login" class="auth-link">Prijavi se</a>
        }
      </div>
    </div>
  `,
})
export class VerifyEmailComponent implements OnInit {
  readonly token = input<string>();

  private auth = inject(AuthService);

  readonly status = signal<'loading' | 'ok' | 'error'>('loading');
  readonly message = signal('');

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
      },
      error: (err) => {
        this.status.set('error');
        this.message.set(apiErrorMessage(err, 'Link je nevažeći ili je već iskorišćen.'));
      },
    });
  }
}
