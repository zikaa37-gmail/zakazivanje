import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_LOADER } from '../interceptors/loader.interceptor';
import { Appointment, BookingPayload, DayAvailability, Quote, Slot } from '../models/appointment.model';
import { PublicService } from '../models/service.model';

const quiet = () => ({ context: new HttpContext().set(SKIP_LOADER, true) });

@Injectable({ providedIn: 'root' })
export class BookingService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  services(): Observable<PublicService[]> {
    return this.http.get<PublicService[]>(`${this.api}/public/services`);
  }

  days(serviceIds: number[], staffMemberId: number | null, from: string, days = 14): Observable<DayAvailability[]> {
    return this.http.post<DayAvailability[]>(
      `${this.api}/availability/days`,
      { service_ids: serviceIds, staff_member_id: staffMemberId, from, days },
      quiet(),
    );
  }

  slots(serviceIds: number[], staffMemberId: number | null, date: string): Observable<Slot[]> {
    return this.http.post<Slot[]>(
      `${this.api}/availability/slots`,
      { service_ids: serviceIds, staff_member_id: staffMemberId, date },
      quiet(),
    );
  }

  quote(serviceIds: number[], date: string | null): Observable<Quote> {
    return this.http.post<Quote>(`${this.api}/bookings/quote`, { service_ids: serviceIds, date }, quiet());
  }

  book(payload: BookingPayload): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.api}/bookings`, payload);
  }

  mine(scope: 'upcoming' | 'past'): Observable<Appointment[]> {
    return this.http.post<Appointment[]>(`${this.api}/my-appointments/list`, { scope });
  }

  cancelMine(id: number): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.api}/my-appointments/${id}/cancel`, {});
  }
}
