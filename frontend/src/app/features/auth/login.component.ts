import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService, QuickLogin } from '../../core/services/auth.service';
import { BusinessSettingService } from '../../core/services/business-setting.service';
import { apiErrorMessage } from '../../core/utils/api-error';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { ButtonDirective } from '../../shared/directives/button.directive';
import { IconDirective } from '../../shared/directives/icon.directive';
import { InputDirective } from '../../shared/directives/input.directive';

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

  readonly devLogins = signal<QuickLogin[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  constructor() {
    this.auth.quickLogins().subscribe({ next: (logins) => this.devLogins.set(logins), error: () => this.devLogins.set([]) });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.signIn(email, password);
  }

  quickLogin(login: QuickLogin): void {
    this.form.patchValue({ email: login.email });
    this.handleLogin(this.auth.quickLogin(login.email));
  }

  private signIn(email: string, password: string): void {
    this.handleLogin(this.auth.login(email, password));
  }

  private handleLogin(request: Observable<unknown>): void {
    this.loading.set(true);
    this.error.set(null);

    request.subscribe({
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
