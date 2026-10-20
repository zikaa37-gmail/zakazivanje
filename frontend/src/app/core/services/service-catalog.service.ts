import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SalonService, SalonServicePayload } from '../models/service.model';

@Injectable({ providedIn: 'root' })
export class ServiceCatalogService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/services`;

  list(): Observable<SalonService[]> {
    return this.http.post<SalonService[]>(`${this.api}/list`, {});
  }

  create(payload: SalonServicePayload): Observable<SalonService> {
    return this.http.post<SalonService>(this.api, payload);
  }

  update(id: number, payload: SalonServicePayload): Observable<SalonService> {
    return this.http.put<SalonService>(`${this.api}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
