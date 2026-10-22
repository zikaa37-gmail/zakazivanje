import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_LOADER } from '../interceptors/loader.interceptor';

export type WaitlistPart = 'any' | 'morning' | 'afternoon';

export const WAITLIST_PARTS: { value: WaitlistPart; label: string }[] = [
  { value: 'any', label: 'Bilo kad' },
  { value: 'morning', label: 'Pre podne' },
  { value: 'afternoon', label: 'Popodne' },
];

export interface WaitlistEntry {
  id: number;
  date: string;
  part: WaitlistPart;
  part_label: string;
  service_ids: number[];
  services: string;
  staff_member: { id: number; first_name: string; last_name: string } | null;
  notified_at: string | null;
  created_at: string;
  client?: { id: number; first_name: string; last_name: string; phone: string | null; email: string | null };
}

@Injectable({ providedIn: 'root' })
export class WaitlistService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  mine(): Observable<WaitlistEntry[]> {
    return this.http.post<WaitlistEntry[]>(`${this.api}/my-waitlist/list`, {}, { context: new HttpContext().set(SKIP_LOADER, true) });
  }

  join(payload: { service_ids: number[]; staff_member_id: number | null; date: string; part: WaitlistPart }): Observable<WaitlistEntry> {
    return this.http.post<WaitlistEntry>(`${this.api}/my-waitlist`, payload);
  }

  leave(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/my-waitlist/${id}`);
  }

  list(): Observable<WaitlistEntry[]> {
    return this.http.post<WaitlistEntry[]>(`${this.api}/waitlist/list`, {}, { context: new HttpContext().set(SKIP_LOADER, true) });
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/waitlist/${id}`);
  }
}
