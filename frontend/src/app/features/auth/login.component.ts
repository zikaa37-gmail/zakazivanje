import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { BusinessSettingService } from '../../core/services/business-setting.service';
import { apiErrorMessage } from '../../core/utils/api-error';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { ButtonDirective } from '../../shared/directives/button.directive';
import { IconDirective } from '../../shared/directives/icon.directive';
import { InputDirective } from '../../shared/directives/input.directive';

interface DevLogin {
  label: string;
  email: string;
  password: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, ButtonDirective, ErrorMessageComponent, IconDirective, InputDirective],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  readonly returnUrl = input<string>();

  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  protected business = inject(BusinessSettingService);

  readonly devLogins: DevLogin[] = environment.devLogins;
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.signIn(email, password);
  }

  quickLogin(login: DevLogin): void {
    this.form.setValue({ email: login.email, password: login.password });
    this.signIn(login.email, login.password);
  }

  private signIn(email: string, password: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.auth.login(email, password).subscribe({
      next: () => {
        this.loading.set(false);
        const target = this.returnUrl();
        this.router.navigateByUrl(target && target.startsWith('/') ? target : this.auth.homeUrl());
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, 'Prijava nije uspela.'));
      },
    });
  }
}
