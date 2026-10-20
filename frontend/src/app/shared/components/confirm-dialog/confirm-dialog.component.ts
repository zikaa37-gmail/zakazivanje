import { Component, inject } from '@angular/core';
import { ConfirmService } from '../../../core/services/confirm.service';
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

  respond(result: boolean): void {
    this.confirmService.respond(result);
  }
}
