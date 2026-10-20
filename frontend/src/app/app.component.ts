import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';
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
  }
}
