import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_LOADER } from '../interceptors/loader.interceptor';
import { Appointment } from '../models/appointment.model';

export interface DashboardToday {
  date: string;
  staff_member_id: number | null;
  appointments: Appointment[];
  next: Appointment | null;
  pending: Appointment[];
  staff: { id: number; name: string; color: string | null; hours: string; appointments: number }[];
  expected_revenue: number;
}

export interface DashboardSummary {
  appointments: number;
  completed: number;
  cancelled: number;
  no_shows: number;
  no_show_rate: number;
  revenue: number;
  average_ticket: number;
  new_clients: number;
}

export interface DemandBucket {
  weekday: number;
  hour: number;
  available: number;
  booked: number;
  rate: number;
  off_peak: boolean;
}

export interface DashboardStats {
  from: string;
  to: string;
  summary: DashboardSummary;
  previous: DashboardSummary;
  series: { date: string; appointments: number; revenue: number }[];
  top_services: { name: string; count: number; revenue: number }[];
  staff_utilization: { id: number; name: string; color: string | null; booked_minutes: number; available_minutes: number; rate: number }[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/dashboard`;

  today(staffMemberId: number | null = null): Observable<DashboardToday> {
    return this.http.post<DashboardToday>(`${this.api}/today`, { staff_member_id: staffMemberId });
  }

  stats(from: string, to: string): Observable<DashboardStats> {
    return this.http.post<DashboardStats>(`${this.api}/stats`, { from, to }, { context: new HttpContext().set(SKIP_LOADER, true) });
  }

  demand(): Observable<{ has_history: boolean; buckets: DemandBucket[] }> {
    return this.http.post<{ has_history: boolean; buckets: DemandBucket[] }>(`${this.api}/demand`, {}, { context: new HttpContext().set(SKIP_LOADER, true) });
  }
}
