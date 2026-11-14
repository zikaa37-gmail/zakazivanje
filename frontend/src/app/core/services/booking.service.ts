import { CancellationFee } from '../models/cancellation-fee.model';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_LOADER } from '../interceptors/loader.interceptor';
import { Appointment, BookingPayload, DayAvailability, Quote, Slot } from '../models/appointment.model';
import { PublicService } from '../models/service.model';
import { MarketingService } from './marketing.service';

const quiet = () => ({ context: new HttpContext().set(SKIP_LOADER, true) });

@Injectable({ providedIn: 'root' })
export class BookingService {
  private http = inject(HttpClient);
  private marketing = inject(MarketingService);
  private api = environment.apiUrl;

  services(): Observable<PublicService[]> {
    return this.http.get<PublicService[]>(`${this.api}/public/services`);
  }

  days(serviceIds: number[], staffMemberId: number | null, from: string, days = 14, ignoreAppointmentId: number | null = null, linkedServiceIds: number[] = []): Observable<DayAvailability[]> {
    return this.http.post<DayAvailability[]>(
      `${this.api}/availability/days`,
      { service_ids: serviceIds, staff_member_id: staffMemberId, from, days, ignore_appointment_id: ignoreAppointmentId, linked_service_ids: linkedServiceIds },
      quiet(),
    );
  }

  slots(serviceIds: number[], staffMemberId: number | null, date: string, ignoreAppointmentId: number | null = null, linkedServiceIds: number[] = []): Observable<Slot[]> {
    return this.http.post<Slot[]>(
      `${this.api}/availability/slots`,
      { service_ids: serviceIds, staff_member_id: staffMemberId, date, ignore_appointment_id: ignoreAppointmentId, linked_service_ids: linkedServiceIds },
      quiet(),
    );
  }

  quote(serviceIds: number[], date: string | null, promoCode: string | null = null, linkedServiceIds: number[] = []): Observable<Quote> {
    return this.http.post<Quote>(`${this.api}/bookings/quote`, { service_ids: serviceIds, date, promo_code: promoCode, linked_service_ids: linkedServiceIds }, quiet());
  }

  book(payload: BookingPayload): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.api}/bookings`, { ...payload, referral: this.marketing.referral() });
  }

  mine(scope: 'upcoming' | 'past'): Observable<Appointment[]> {
    return this.http.post<Appointment[]>(`${this.api}/my-appointments/list`, { scope });
  }

  rescheduleMine(id: number, staffMemberId: number | null, startsAt: string): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.api}/my-appointments/${id}/reschedule`, { staff_member_id: staffMemberId, starts_at: startsAt });
  }

  cancelMine(id: number, acceptLate = false, linkedIds: number[] = []): Observable<Appointment & { cancellation_fee: CancellationFee | null; cancelled_ids: number[] }> {
    return this.http.post<Appointment & { cancellation_fee: CancellationFee | null; cancelled_ids: number[] }>(`${this.api}/my-appointments/${id}/cancel`, { accept_late: acceptLate, linked_ids: linkedIds });
  }
}
