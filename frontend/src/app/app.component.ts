import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { BusinessSettingService } from './core/services/business-setting.service';
import { MarketingService } from './core/services/marketing.service';
import { PushService } from './core/services/push.service';
import { RealtimeService } from './core/services/realtime.service';
import { ThemeService } from './core/services/theme.service';
import { applyAppIcons } from './core/utils/app-icons';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';
import { SpinnerComponent } from './shared/components/spinner/spinner.component';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ConfirmDialogComponent, SpinnerComponent, ToastContainerComponent],
  template: `
    <router-outlet />
    <app-confirm-dialog />
    <app-spinner [overlay]="true" [size]="40" />
    <app-toast-container />
  `,
})
export class AppComponent {
  constructor() {
    inject(ThemeService).init();
    inject(MarketingService).capture();
    inject(RealtimeService);
    inject(PushService);
    const business = inject(BusinessSettingService);
    const auth = inject(AuthService);
    effect(() => document.documentElement.classList.toggle('ui-spacious', auth.currentUser()?.ui_mode === 'spacious'));
    effect(() => {
      const settings = business.settings();
      if (settings) applyAppIcons(settings.logo, settings.name);
    });
  }
}
