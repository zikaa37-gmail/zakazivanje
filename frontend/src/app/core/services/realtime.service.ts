import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import type Pusher from 'pusher-js';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_LOADER } from '../interceptors/loader.interceptor';
import { User } from '../models/user.model';
import { AppointmentService } from './appointment.service';
import { AuthService } from './auth.service';
import { BusinessSettingService } from './business-setting.service';
import { ToastService } from './toast.service';

export interface RealtimeEvent {
  kind: 'booked' | 'status' | 'cancelled' | 'moved' | 'transferred' | 'changed' | 'ask_reschedule';
  appointment_id: number;
  status: string;
  starts_at: string;
  staff_member_ids: number[];
  actor_id: number | null;
  message: string | null;
}

const STAFF_CHANNEL = 'private-salon';
const EVENT = 'appointment';

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private business = inject(BusinessSettingService);
  private toast = inject(ToastService);
  private appointments = inject(AppointmentService);

  readonly events = new Subject<RealtimeEvent>();
  readonly version = signal(0);
  readonly connected = signal(false);

  private client: Pusher | null = null;
  private connection = '';

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      const config = this.business.settings()?.realtime ?? null;
      untracked(() => void this.connect(user, config));
    });
  }

  private async connect(user: User | null, config: { key: string; cluster: string } | null): Promise<void> {
    const channel = user && config ? (this.auth.isStaff() ? STAFF_CHANNEL : `private-user-${user.id}`) : '';
    const connection = channel ? `${config!.key}|${config!.cluster}|${channel}` : '';
    if (connection === this.connection) return;

    this.disconnect();
    this.connection = connection;
    if (!channel || !config) return;

    const { default: PusherClient } = await import('pusher-js');
    if (this.connection !== connection) return;

    this.client = new PusherClient(config.key, {
      cluster: config.cluster,
      channelAuthorization: {
        endpoint: '',
        transport: 'ajax',
        customHandler: ({ socketId, channelName }, callback) => {
          this.http
            .post<{ auth: string }>(`${environment.apiUrl}/realtime/auth`, { socket_id: socketId, channel_name: channelName }, { context: new HttpContext().set(SKIP_LOADER, true) })
            .subscribe({ next: (data) => callback(null, data), error: (err) => callback(err, null) });
        },
      },
    });
    this.client.connection.bind('state_change', ({ current }: { current: string }) => this.connected.set(current === 'connected'));
    this.client.subscribe(channel).bind(EVENT, (event: RealtimeEvent) => this.handle(event));
  }

  private disconnect(): void {
    this.client?.disconnect();
    this.client = null;
    this.connected.set(false);
  }

  private handle(event: RealtimeEvent): void {
    this.version.update((v) => v + 1);
    this.events.next(event);
    if (this.auth.isStaff()) this.appointments.refreshPendingCount();
    if (event.message && event.actor_id !== this.auth.currentUser()?.id && this.concernsMe(event)) {
      this.toast.show(event.message, { type: event.kind === 'cancelled' ? 'warning' : 'info', position: 'top-right', duration: 8000 });
    }
  }

  private concernsMe(event: RealtimeEvent): boolean {
    if (!this.auth.isStaff() || this.auth.isManager()) return true;
    const staffId = this.auth.currentUser()?.staff_member_id;
    return staffId != null && event.staff_member_ids.includes(staffId);
  }
}
