import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type NotificationStatus = 'sent' | 'skipped' | 'failed';

export interface NotificationLogEntry {
  id: number;
  type: string;
  channel: 'mail' | 'whatsapp';
  recipient: string | null;
  status: NotificationStatus;
  error: string | null;
  created_at: string;
  user: { id: number; first_name: string; last_name: string } | null;
}

export const NOTIFICATION_TYPES: Record<string, string> = {
  appointment_received: 'Termin primljen',
  appointment_confirmed: 'Termin potvrđen',
  appointment_cancelled: 'Termin otkazan',
  appointment_reminder: 'Podsetnik',
  appointment_rescheduled: 'Termin pomeren',
  review_request: 'Molba za ocenu',
  waitlist_slot: 'Lista čekanja: oslobodio se termin',
  admin_new_booking: 'Salonu: novi termin',
  admin_client_cancelled: 'Salonu: klijent otkazao',
  email_verification: 'Potvrda emaila',
  password_reset: 'Reset lozinke',
  staff_invite: 'Pozivnica osoblju',
  report: 'Izveštaj',
  discipline_zone_raised: 'Klijent u višoj zoni',
  discipline_blocked_attempt: 'Blokiran klijent pokušava da zakaže',
  test: 'Probna poruka',
};

@Injectable({ providedIn: 'root' })
export class NotificationLogService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  list(status: NotificationStatus | null = null): Observable<NotificationLogEntry[]> {
    return this.http.post<NotificationLogEntry[]>(`${this.api}/notification-logs/list`, { status });
  }

  test(channel: 'mail' | 'whatsapp'): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/notifications/test`, { channel });
  }
}
