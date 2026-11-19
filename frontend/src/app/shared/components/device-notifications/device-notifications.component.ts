import { Component, inject } from '@angular/core';
import { PushService } from '../../../core/services/push.service';
import { ToastService } from '../../../core/services/toast.service';
import { ButtonDirective } from '../../directives/button.directive';
import { IconDirective } from '../../directives/icon.directive';

@Component({
  selector: 'app-device-notifications',
  imports: [ButtonDirective, IconDirective],
  templateUrl: './device-notifications.component.html',
})
export class DeviceNotificationsComponent {
  protected push = inject(PushService);
  private toast = inject(ToastService);

  async enable(): Promise<void> {
    if (await this.push.enable()) {
      this.toast.success('Obaveštenja su uključena na ovom uređaju.');
    } else if (this.push.permission() === 'denied') {
      this.toast.error('Obaveštenja su blokirana u podešavanjima pregledača za ovaj sajt.');
    } else {
      this.toast.error('Obaveštenja nisu uključena.');
    }
  }

  async disable(): Promise<void> {
    await this.push.disable();
    this.toast.success('Obaveštenja na ovom uređaju su isključena.');
  }
}
