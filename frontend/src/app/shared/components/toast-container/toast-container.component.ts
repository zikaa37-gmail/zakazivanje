import { Component, inject } from '@angular/core';
import { IconDirective, IconName } from '../../directives/icon.directive';
import { ToastPosition, ToastService, ToastType } from '../../../core/services/toast.service';

const POSITIONS: ToastPosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

const ICON_BY_TYPE: Record<ToastType, IconName> = {
  error: 'alert-triangle',
  warning: 'alert-triangle',
  success: 'check',
  info: 'info',
};

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [IconDirective],
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.scss',
})
export class ToastContainerComponent {
  protected toastService = inject(ToastService);
  protected readonly positions = POSITIONS;

  toastsFor(position: ToastPosition) {
    return this.toastService.toasts().filter((t) => t.position === position);
  }

  iconFor(type: ToastType): IconName {
    return ICON_BY_TYPE[type];
  }
}
