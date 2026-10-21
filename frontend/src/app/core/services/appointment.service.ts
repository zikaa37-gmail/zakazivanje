import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_LOADER } from '../interceptors/loader.interceptor';
import { AdminAppointmentPayload, Appointment, AppointmentStatus, BlockedTime, Recurrence } from '../models/appointment.model';

export interface AppointmentFilters {
  from: string;
  to: string;
  staff_member_id: number | null;
  status: AppointmentStatus | null;
  search: string | null;
}

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/appointments`;

  readonly pendingCount = signal(0);

  list(filters: AppointmentFilters): Observable<Appointment[]> {
    return this.http.post<Appointment[]>(`${this.api}/list`, filters);
  }

  refreshPendingCount(): void {
    this.http
      .post<{ count: number }>(`${this.api}/pending-count`, {}, { context: new HttpContext().set(SKIP_LOADER, true) })
      .subscribe({ next: (res) => this.pendingCount.set(res.count), error: () => undefined });
  }

  create(payload: AdminAppointmentPayload): Observable<{ appointments: Appointment[]; skipped: string[] }> {
    return this.http
      .post<{ appointments: Appointment[]; skipped: string[] }>(this.api, payload)
      .pipe(tap(() => this.refreshPendingCount()));
  }

  setStatus(id: number, status: AppointmentStatus): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.api}/${id}/status`, { status }).pipe(tap(() => this.refreshPendingCount()));
  }

  cancel(id: number, scope: 'this' | 'series'): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(`${this.api}/${id}/cancel`, { scope })
      .pipe(tap(() => this.refreshPendingCount()));
  }

  reschedule(id: number, staffMemberId: number, startsAt: string): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.api}/${id}/reschedule`, { staff_member_id: staffMemberId, starts_at: startsAt });
  }

  blockedTimes(from: string, to: string): Observable<BlockedTime[]> {
    return this.http.post<BlockedTime[]>(`${environment.apiUrl}/blocked-times/list`, { from, to });
  }

  createBlockedTime(payload: { staff_member_id: number | null; starts_at: string; ends_at: string; reason: string | null }): Observable<BlockedTime> {
    return this.http.post<BlockedTime>(`${environment.apiUrl}/blocked-times`, payload);
  }

  deleteBlockedTime(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/blocked-times/${id}`);
  }

  recurrences(): Observable<Recurrence[]> {
    return this.http.post<Recurrence[]>(`${environment.apiUrl}/recurrences/list`, {});
  }
}
