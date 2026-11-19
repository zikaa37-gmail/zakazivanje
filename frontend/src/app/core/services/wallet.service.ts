import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaymentMethod } from '../models/payment.model';
import { GiftCard, GiftCardCheck, GiftCardPayload, GiftCardStatus, Wallet } from '../models/wallet.model';

@Injectable({ providedIn: 'root' })
export class WalletService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  forClient(clientId: number): Observable<Wallet> {
    return this.http.get<Wallet>(`${this.api}/clients/${clientId}/wallet`);
  }

  deposit(clientId: number, amount: number, paymentMethod: PaymentMethod, note: string | null): Observable<Wallet> {
    return this.http.post<Wallet>(`${this.api}/clients/${clientId}/wallet/deposit`, { amount, payment_method: paymentMethod, note });
  }

  adjust(clientId: number, amount: number, note: string): Observable<Wallet> {
    return this.http.post<Wallet>(`${this.api}/clients/${clientId}/wallet/adjust`, { amount, note });
  }

  claimForClient(clientId: number, code: string): Observable<Wallet> {
    return this.http.post<Wallet>(`${this.api}/clients/${clientId}/wallet/claim`, { code });
  }

  mine(): Observable<Wallet> {
    return this.http.post<Wallet>(`${this.api}/my-wallet`, {});
  }

  claimMine(code: string): Observable<Wallet> {
    return this.http.post<Wallet>(`${this.api}/my-wallet/claim`, { code });
  }

  payMine(appointmentId: number, source: 'wallet' | 'gift_card', code: string | null): Observable<{ message: string; wallet: Wallet }> {
    return this.http.post<{ message: string; wallet: Wallet }>(`${this.api}/my-appointments/${appointmentId}/pay`, { source, code });
  }

  giftCards(status: GiftCardStatus | null, search: string | null): Observable<GiftCard[]> {
    return this.http.post<GiftCard[]>(`${this.api}/gift-cards/list`, { status, search });
  }

  checkGiftCard(code: string): Observable<GiftCardCheck> {
    return this.http.post<GiftCardCheck>(`${this.api}/gift-cards/check`, { code });
  }

  sellGiftCard(payload: GiftCardPayload): Observable<GiftCard> {
    return this.http.post<GiftCard>(`${this.api}/gift-cards`, payload);
  }

  cancelGiftCard(id: number): Observable<GiftCard> {
    return this.http.post<GiftCard>(`${this.api}/gift-cards/${id}/cancel`, {});
  }
}
