import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Promotion, PromotionPayload } from '../models/promotion.model';

@Injectable({ providedIn: 'root' })
export class PromotionService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/promotions`;

  list(): Observable<Promotion[]> {
    return this.http.post<Promotion[]>(`${this.api}/list`, {});
  }

  create(payload: PromotionPayload): Observable<Promotion> {
    return this.http.post<Promotion>(this.api, payload);
  }

  update(id: number, payload: PromotionPayload): Observable<Promotion> {
    return this.http.put<Promotion>(`${this.api}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
