import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminReviews, PublicReviews, Review, ReviewFilters } from '../models/review.model';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  publicList(): Observable<PublicReviews> {
    return this.http.get<PublicReviews>(`${this.api}/public/reviews`);
  }

  list(filters: ReviewFilters): Observable<AdminReviews> {
    return this.http.post<AdminReviews>(`${this.api}/reviews/list`, filters);
  }

  update(id: number, payload: { visible?: boolean; reply?: string | null }): Observable<Review> {
    return this.http.put<Review>(`${this.api}/reviews/${id}`, payload);
  }

  submit(appointmentId: number, rating: number, comment: string | null): Observable<Review> {
    return this.http.post<Review>(`${this.api}/my-appointments/${appointmentId}/review`, { rating, comment });
  }
}
