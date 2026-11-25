import { AffectedAppointment } from '../models/staff-absence.model';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StaffMember, StaffMemberPayload } from '../models/staff.model';

@Injectable({ providedIn: 'root' })
export class StaffService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/staff`;

  list(): Observable<StaffMember[]> {
    return this.http.post<StaffMember[]>(`${this.api}/list`, {});
  }

  create(payload: StaffMemberPayload): Observable<StaffMember> {
    return this.http.post<StaffMember>(this.api, payload);
  }

  update(id: number, payload: StaffMemberPayload): Observable<StaffMember> {
    return this.http.put<StaffMember>(`${this.api}/${id}`, payload);
  }

  invite(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/${id}/invite`, {});
  }

  setPassword(id: number, password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/${id}/password`, { password });
  }

  setActive(id: number, active: boolean, cancelFuture = false): Observable<StaffMember & { cancelled_appointments: number }> {
    return this.http.post<StaffMember & { cancelled_appointments: number }>(`${this.api}/${id}/active`, { active, cancel_future: cancelFuture });
  }

  futureAppointments(id: number): Observable<AffectedAppointment[]> {
    return this.http.get<AffectedAppointment[]>(`${this.api}/${id}/future-appointments`);
  }
}
