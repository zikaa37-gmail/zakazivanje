import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_LOADER } from '../interceptors/loader.interceptor';
import { AdminAppointmentPayload, Appointment, AppointmentStatus, Recurrence } from '../models/appointment.model';

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

  recurrences(): Observable<Recurrence[]> {
    return this.http.post<Recurrence[]>(`${environment.apiUrl}/recurrences/list`, {});
  }
}
