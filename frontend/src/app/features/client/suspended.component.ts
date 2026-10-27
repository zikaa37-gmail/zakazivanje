import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { BusinessSettingService } from '../../core/services/business-setting.service';
import { IconDirective } from '../../shared/directives/icon.directive';
import { ButtonDirective } from '../../shared/directives/button.directive';

@Component({
  selector: 'app-suspended',
  standalone: true,
  imports: [ButtonDirective, IconDirective],
  templateUrl: './suspended.component.html',
})
export class SuspendedComponent {
  protected auth = inject(AuthService);
  protected business = inject(BusinessSettingService);
  private router = inject(Router);

  constructor() {
    if (!this.auth.isAuthenticated()) {
      this.router.navigateByUrl('/');
      return;
    }
    this.auth.loadMe().subscribe((user) => {
      if (!user.suspended) this.router.navigateByUrl(this.auth.homeUrl());
    });
  }

  logout(): void {
    this.auth.logout();
  }
}
