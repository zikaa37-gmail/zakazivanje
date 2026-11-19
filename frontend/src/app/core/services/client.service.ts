import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ClientDirectoryService } from './client-directory.service';
import { Client, ClientDeactivationImpact, ClientHistory, ClientPayload, DisciplineZone, Paginated, ZonePayload } from '../models/client.model';

@Injectable({ providedIn: 'root' })
export class ClientService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/clients`;
  private directory = inject(ClientDirectoryService);

  list(search: string, page = 1, zone: DisciplineZone | null = null, options: { context?: HttpContext; active?: boolean } = {}): Observable<Paginated<Client>> {
    const { active = true, ...http } = options;
    return this.http.post<Paginated<Client>>(`${this.api}/list`, { search: search || null, page, zone, active }, http);
  }

  history(id: number, beforeId: number | null = null): Observable<ClientHistory> {
    return this.http.post<ClientHistory>(`${this.api}/${id}/activity`, { before_id: beforeId });
  }

  setZone(id: number, payload: ZonePayload): Observable<Client> {
    return this.http.put<Client>(`${this.api}/${id}/zone`, payload).pipe(tap(() => this.directory.invalidate()));
  }

  create(payload: ClientPayload): Observable<Client> {
    return this.http.post<Client>(this.api, payload).pipe(tap(() => this.directory.invalidate()));
  }

  update(id: number, payload: ClientPayload): Observable<Client> {
    return this.http.put<Client>(`${this.api}/${id}`, payload).pipe(tap(() => this.directory.invalidate()));
  }

  setNickname(id: number, nickname: string | null): Observable<Client> {
    return this.http.put<Client>(`${this.api}/${id}/nickname`, { nickname }).pipe(tap(() => this.directory.invalidate()));
  }

  deactivateCheck(id: number): Observable<ClientDeactivationImpact> {
    return this.http.get<ClientDeactivationImpact>(`${this.api}/${id}/deactivate-check`);
  }

  setActive(id: number, active: boolean, cancelFuture = false): Observable<Client & { cancelled_appointments: number }> {
    return this.http
      .post<Client & { cancelled_appointments: number }>(`${this.api}/${id}/active`, { active, cancel_future: cancelFuture })
      .pipe(tap(() => this.directory.invalidate()));
  }
}
