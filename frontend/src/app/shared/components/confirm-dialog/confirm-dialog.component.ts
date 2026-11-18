import { Component, effect, inject, signal } from '@angular/core';
import { ConfirmService } from '../../../core/services/confirm.service';
import { AuthService } from '../../../core/services/auth.service';
import { ButtonDirective } from '../../directives/button.directive';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [ButtonDirective],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  readonly confirmService = inject(ConfirmService);
  private auth = inject(AuthService);
  readonly armed = signal(true);
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const request = this.confirmService.request();
      if (this.timer) clearTimeout(this.timer);
      const careful = !!request && this.auth.currentUser()?.ui_mode === 'spacious';
      this.armed.set(!careful);
      if (careful) this.timer = setTimeout(() => this.armed.set(true), 1200);
    });
  }

  respond(result: boolean): void {
    if (result && !this.armed()) return;
    this.confirmService.respond(result);
  }
}
