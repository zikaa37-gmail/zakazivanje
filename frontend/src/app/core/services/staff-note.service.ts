import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_LOADER } from '../interceptors/loader.interceptor';

export interface StaffNote {
  id: number;
  body: string;
  created_at: string;
  author: { id: number; name: string } | null;
  status: 'open' | 'taken' | 'done';
  taken_by: { id: number; name: string } | null;
  taken_at: string | null;
  resolved_at: string | null;
  resolver: string | null;
  recipients: string[];
  readers: string[];
  unread: boolean;
  can_delete: boolean;
}

export interface NoteRecipient {
  user_id: number | null;
  name: string;
  role: string | null;
  staff_member_id: number | null;
  always: boolean;
}

@Injectable({ providedIn: 'root' })
export class StaffNoteService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/notes`;

  readonly unreadCount = signal(0);

  list(): Observable<StaffNote[]> {
    return this.http.post<StaffNote[]>(`${this.api}/list`, {});
  }

  recipients(): Observable<NoteRecipient[]> {
    return this.http.post<NoteRecipient[]>(`${this.api}/recipients`, {}, { context: new HttpContext().set(SKIP_LOADER, true) });
  }

  create(body: string, recipientIds: number[]): Observable<StaffNote> {
    return this.http.post<StaffNote>(this.api, { body, recipient_ids: recipientIds });
  }

  toggleResolved(id: number): Observable<StaffNote> {
    return this.http.post<StaffNote>(`${this.api}/${id}/resolve`, {});
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/${id}`);
  }

  markRead(id: number): Observable<StaffNote> {
    return this.http.post<StaffNote>(`${this.api}/${id}/read`, {});
  }

  take(id: number): Observable<StaffNote> {
    return this.http.post<StaffNote>(`${this.api}/${id}/take`, {});
  }

  refreshUnreadCount(): void {
    this.http
      .post<{ count: number }>(`${this.api}/unread-count`, {}, { context: new HttpContext().set(SKIP_LOADER, true) })
      .subscribe({ next: (res) => this.unreadCount.set(res.count), error: () => undefined });
  }
}
