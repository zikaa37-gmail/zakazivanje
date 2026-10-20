import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { COMMUNICATION_OPTIONS, CommunicationChannel } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { BusinessSettingService } from '../../core/services/business-setting.service';
import { apiErrorMessage } from '../../core/utils/api-error';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { IconDirective } from '../../shared/directives/icon.directive';
import { InputDirective } from '../../shared/directives/input.directive';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, ErrorMessageComponent, IconDirective, InputDirective],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  protected business = inject(BusinessSettingService);

  readonly communication = COMMUNICATION_OPTIONS;
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly done = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    first_name: ['', [Validators.required, Validators.minLength(2)]],
    last_name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    preferred_communication: ['email' as CommunicationChannel],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Proveri polja — lozinka mora imati bar 8 karaktera.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.auth.register({ ...this.form.getRawValue(), whatsapp_number: null }).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.done.set(res.message);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, 'Registracija nije uspela.'));
      },
    });
  }
}
