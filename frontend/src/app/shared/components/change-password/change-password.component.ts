import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { IconDirective } from '../../directives/icon.directive';
import { InputDirective } from '../../directives/input.directive';
import { ButtonComponent } from '../button/button.component';
import { ErrorMessageComponent } from '../error-message/error-message.component';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, ErrorMessageComponent, IconDirective, InputDirective],
  templateUrl: './change-password.component.html',
})
export class ChangePasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  readonly open = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    current_password: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(8)]],
    password_confirmation: ['', Validators.required],
  });

  save(): void {
    const value = this.form.getRawValue();
    if (this.form.invalid || value.password !== value.password_confirmation) {
      this.error.set(value.password.length < 8 ? 'Nova lozinka mora imati bar 8 karaktera.' : 'Nove lozinke se ne poklapaju.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.auth.changePassword(value).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.toast.success(res.message);
        this.auth.clearSession('/login');
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(err, 'Promena lozinke nije uspela.'));
      },
    });
  }
}
