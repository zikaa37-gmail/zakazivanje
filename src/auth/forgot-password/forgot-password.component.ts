import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';

import { AuthService } from '../auth.service';
import { ForgotPasswordRequest } from '../auth.model';

@Component({
  selector: 'app-forgot-password',
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
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  forgotPasswordForm: FormGroup;
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  constructor() {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  get isLoading() {
    return this.authService.isLoading;
  }

  onSubmit(): void {
    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    const data: ForgotPasswordRequest = this.forgotPasswordForm.value;

    this.authService.forgotPassword(data).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage.set(
            'Link za resetovanje lozinke je poslat na vašu email adresu.',
          );
          this.forgotPasswordForm.reset();
        }
      },
      error: (error) => {
        this.errorMessage.set(
          error.message || 'Greška pri slanju emaila. Pokušajte ponovo.',
        );
      },
    });
  }
}
