import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Appointment } from '../models/appointment.model';
import { PaymentDetails, PaymentMethod } from '../models/payment.model';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  details(id: number, asClient: boolean): Observable<PaymentDetails> {
    return this.http.post<PaymentDetails>(`${this.api}/${this.base(asClient)}/${id}/payment`, {});
  }

  markPaid(id: number, method: PaymentMethod | null): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.api}/appointments/${id}/paid`, { method });
  }

  async openSlip(id: number, asClient: boolean): Promise<void> {
    const blob = await firstValueFrom(this.http.post(`${this.api}/${this.base(asClient)}/${id}/slip`, {}, { responseType: 'blob' }));
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `uplatnica-${id}.pdf`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  private base(asClient: boolean): string {
    return asClient ? 'my-appointments' : 'appointments';
  }
}
