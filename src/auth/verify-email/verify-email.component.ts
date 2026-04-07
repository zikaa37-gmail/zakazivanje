import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';

import { VerifyEmailRequest } from '../auth.model';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmailComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isVerifying = signal<boolean>(true);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParams['token'];

    if (!token) {
      this.isVerifying.set(false);
      this.errorMessage.set('Token nije pronađen. Link je možda istekao.');
      return;
    }

    this.verifyEmail(token);
  }

  private verifyEmail(token: string): void {
    const data: VerifyEmailRequest = { token };

    this.authService.verifyEmail(data).subscribe({
      next: (response) => {
        this.isVerifying.set(false);
        if (response.success) {
          this.successMessage.set('Email je uspešno verifikovan! Preusmeravamo vas na prijavu...');
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 2000);
        }
      },
      error: (error) => {
        this.isVerifying.set(false);
        this.errorMessage.set(error.message || 'Greška pri verifikaciji. Token je možda istekao.');
      },
    });
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
