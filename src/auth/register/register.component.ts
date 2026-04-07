import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../auth.service';
import { CommunicationType, RegisterClientRequest } from '../auth.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  registerForm: FormGroup;
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  communicationTypes = [
    { value: CommunicationType.EMAIL, label: 'Email' },
    { value: CommunicationType.WHATSAPP, label: 'WhatsApp' },
    { value: CommunicationType.BOTH, label: 'Email i WhatsApp' },
  ];

  constructor() {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?\d{9,15}$/)]],
      whatsappNumber: [''],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      preferredCommunication: [CommunicationType.WHATSAPP, [Validators.required]],
    });
  }

  get isLoading() {
    return this.authService.isLoading;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const { confirmPassword, ...data } = this.registerForm.value;

    if (data.password !== confirmPassword) {
      this.errorMessage.set('Lozinke se ne poklapaju');
      return;
    }

    const registerData: RegisterClientRequest = {
      ...data,
      whatsappNumber: data.whatsappNumber || data.phone,
    };

    this.authService.registerClient(registerData).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage.set(
            'Registracija uspešna! Proverite email za verifikaciju naloga.',
          );
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 3000);
        }
      },
      error: (error) => {
        this.errorMessage.set(
          error.message || 'Greška pri registraciji. Pokušajte ponovo.',
        );
      },
    });
  }
}
