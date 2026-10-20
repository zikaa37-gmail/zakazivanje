import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Client, ClientPayload, Paginated } from '../models/client.model';

@Injectable({ providedIn: 'root' })
export class ClientService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/clients`;

  list(search: string, page = 1): Observable<Paginated<Client>> {
    return this.http.post<Paginated<Client>>(`${this.api}/list`, { search: search || null, page });
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
