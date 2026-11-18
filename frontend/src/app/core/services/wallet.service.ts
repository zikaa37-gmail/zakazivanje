import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaymentMethod } from '../models/payment.model';
import { GiftCard, GiftCardPayload, GiftCardStatus, Wallet } from '../models/wallet.model';

@Injectable({ providedIn: 'root' })
export class WalletService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  forClient(clientId: number): Observable<Wallet> {
    return this.http.post<Wallet>(`${this.api}/clients/${clientId}/wallet`, {});
  }

  deposit(clientId: number, amount: number, paymentMethod: PaymentMethod, note: string | null): Observable<Wallet> {
    return this.http.post<Wallet>(`${this.api}/clients/${clientId}/wallet/deposit`, { amount, payment_method: paymentMethod, note });
  }

  adjust(clientId: number, amount: number, note: string): Observable<Wallet> {
    return this.http.post<Wallet>(`${this.api}/clients/${clientId}/wallet/adjust`, { amount, note });
  }

  redeemForClient(clientId: number, code: string): Observable<Wallet> {
    return this.http.post<Wallet>(`${this.api}/clients/${clientId}/wallet/redeem`, { code });
  }

  mine(): Observable<Wallet> {
    return this.http.post<Wallet>(`${this.api}/my-wallet`, {});
  }

  redeemMine(code: string): Observable<Wallet> {
    return this.http.post<Wallet>(`${this.api}/my-wallet/redeem`, { code });
  }

  giftCards(status: GiftCardStatus | null, search: string | null): Observable<GiftCard[]> {
    return this.http.post<GiftCard[]>(`${this.api}/gift-cards/list`, { status, search });
  }

  sellGiftCard(payload: GiftCardPayload): Observable<GiftCard> {
    return this.http.post<GiftCard>(`${this.api}/gift-cards`, payload);
  }

  cancelGiftCard(id: number): Observable<GiftCard> {
    return this.http.post<GiftCard>(`${this.api}/gift-cards/${id}/cancel`, {});
  }
}
