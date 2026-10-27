import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TeamMember, TeamMemberPayload } from '../models/team.model';

@Injectable({ providedIn: 'root' })
export class TeamService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/team`;

  list(): Observable<TeamMember[]> {
    return this.http.post<TeamMember[]>(`${this.api}/list`, {});
  }

  create(payload: TeamMemberPayload): Observable<TeamMember> {
    return this.http.post<TeamMember>(this.api, payload);
  }

  update(id: number, payload: TeamMemberPayload): Observable<TeamMember> {
    return this.http.put<TeamMember>(`${this.api}/${id}`, payload);
  }

  invite(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/${id}/invite`, {});
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
