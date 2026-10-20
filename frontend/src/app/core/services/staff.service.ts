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

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
