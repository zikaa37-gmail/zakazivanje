import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Client, ClientHistory, ClientPayload, DisciplineZone, Paginated, ZonePayload } from '../models/client.model';

@Injectable({ providedIn: 'root' })
export class ClientService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/clients`;

  list(search: string, page = 1, zone: DisciplineZone | null = null, options: { context?: HttpContext } = {}): Observable<Paginated<Client>> {
    return this.http.post<Paginated<Client>>(`${this.api}/list`, { search: search || null, page, zone }, options);
  }

  history(id: number, beforeId: number | null = null): Observable<ClientHistory> {
    return this.http.post<ClientHistory>(`${this.api}/${id}/activity`, { before_id: beforeId });
  }

  setZone(id: number, payload: ZonePayload): Observable<Client> {
    return this.http.put<Client>(`${this.api}/${id}/zone`, payload);
  }

  create(payload: ClientPayload): Observable<Client> {
    return this.http.post<Client>(this.api, payload);
  }

  update(id: number, payload: ClientPayload): Observable<Client> {
    return this.http.put<Client>(`${this.api}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
