import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_LOADER } from '../interceptors/loader.interceptor';
import { CancellationFee, CancellationFeeStatus, CancellationPreview, CancellationStatus } from '../models/cancellation-fee.model';
import { PaymentMethod } from '../models/payment.model';

@Injectable({ providedIn: 'root' })
export class CancellationFeeService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;
  private quiet = { context: new HttpContext().set(SKIP_LOADER, true) };

  list(filters: { client_id?: number; status?: CancellationFeeStatus }): Observable<CancellationFee[]> {
    return this.http.post<CancellationFee[]>(`${this.api}/cancellation-fees/list`, filters, this.quiet);
  }

  clientStatus(clientId: number): Observable<CancellationStatus> {
    return this.http.get<CancellationStatus>(`${this.api}/clients/${clientId}/cancellation-status`, this.quiet);
  }

  previewForSalon(appointmentId: number): Observable<CancellationPreview> {
    return this.http.get<CancellationPreview>(`${this.api}/appointments/${appointmentId}/cancel-preview`);
  }

  previewForClient(appointmentId: number, linkedIds: number[] = []): Observable<CancellationPreview> {
    return this.http.post<CancellationPreview>(`${this.api}/my-appointments/${appointmentId}/cancel-preview`, { linked_ids: linkedIds });
  }

  myStatus(): Observable<CancellationStatus> {
    return this.http.get<CancellationStatus>(`${this.api}/my-cancellation-status`, this.quiet);
  }

  markPaid(id: number, paymentMethod: PaymentMethod): Observable<CancellationFee> {
    return this.http.post<CancellationFee>(`${this.api}/cancellation-fees/${id}/paid`, { payment_method: paymentMethod });
  }

  waive(id: number, reason: string): Observable<CancellationFee> {
    return this.http.post<CancellationFee>(`${this.api}/cancellation-fees/${id}/waive`, { reason });
  }

  adjust(id: number, amount: number, reason: string): Observable<CancellationFee> {
    return this.http.post<CancellationFee>(`${this.api}/cancellation-fees/${id}/adjust`, { amount, reason });
  }
}
