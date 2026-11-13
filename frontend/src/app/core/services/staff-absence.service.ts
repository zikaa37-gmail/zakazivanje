import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_LOADER } from '../interceptors/loader.interceptor';
import { AffectedAppointment, StaffAbsence, StaffAbsencePayload } from '../models/staff-absence.model';

@Injectable({ providedIn: 'root' })
export class StaffAbsenceService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/staff-absences`;

  readonly pendingCount = signal(0);

  list(includePast = false): Observable<StaffAbsence[]> {
    return this.http.post<StaffAbsence[]>(`${this.api}/list`, { include_past: includePast });
  }

  refreshPendingCount(): void {
    this.http
      .post<{ count: number }>(`${this.api}/pending-count`, {}, { context: new HttpContext().set(SKIP_LOADER, true) })
      .subscribe({ next: (res) => this.pendingCount.set(res.count), error: () => undefined });
  }

  create(payload: StaffAbsencePayload): Observable<StaffAbsence> {
    return this.http.post<StaffAbsence>(this.api, payload);
  }

  approve(id: number): Observable<StaffAbsence> {
    return this.http.post<StaffAbsence>(`${this.api}/${id}/approve`, {}).pipe(tap(() => this.refreshPendingCount()));
  }

  reject(id: number): Observable<StaffAbsence> {
    return this.http.post<StaffAbsence>(`${this.api}/${id}/reject`, {}).pipe(tap(() => this.refreshPendingCount()));
  }

  remove(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/${id}`).pipe(tap(() => this.refreshPendingCount()));
  }

  appointments(id: number): Observable<AffectedAppointment[]> {
    return this.http.get<AffectedAppointment[]>(`${this.api}/${id}/appointments`);
  }
}
