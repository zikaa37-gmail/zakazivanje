import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../auth.service';
import { ResetPasswordRequest } from '../auth.model';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  resetPasswordForm: FormGroup;
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  private token = signal<string>('');

  constructor() {
    this.resetPasswordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.token.set(this.route.snapshot.queryParams['token'] || '');

    if (!this.token()) {
      this.errorMessage.set('Token nije pronađen. Link je možda istekao.');
    }
  }

  get isLoading() {
    return this.authService.isLoading;
  }

  onSubmit(): void {
    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    const { password, confirmPassword } = this.resetPasswordForm.value;

    if (password !== confirmPassword) {
      this.errorMessage.set('Lozinke se ne poklapaju');
      return;
    }

    const data: ResetPasswordRequest = {
      token: this.token(),
      password,
      confirmPassword,
    };

    this.authService.resetPassword(data).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage.set('Lozinka je uspešno promenjena. Preusmeravamo vas na prijavu...');
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 2000);
        }
      },
      error: (error) => {
        this.errorMessage.set(
          error.message || 'Greška pri resetovanju lozinke. Token je možda istekao.',
        );
      },
    });
  }
}
