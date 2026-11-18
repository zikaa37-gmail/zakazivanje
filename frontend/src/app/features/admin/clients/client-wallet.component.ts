import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { PAYMENT_LABELS, PAYMENT_METHODS, PaymentMethod } from '../../../core/models/payment.model';
import { WALLET_KIND_LABELS, Wallet, WalletEntry } from '../../../core/models/wallet.model';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { WalletService } from '../../../core/services/wallet.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { ButtonDirective } from '../../../shared/directives/button.directive';
import { InputDirective } from '../../../shared/directives/input.directive';
import { RsdPipe } from '../../../shared/pipes/rsd.pipe';
import { SrDateTimePipe } from '../../../shared/pipes/sr-date-time.pipe';

type Mode = 'deposit' | 'gift' | 'adjust';

@Component({
  selector: 'app-client-wallet',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonDirective, InputDirective, RsdPipe, SrDateTimePipe],
  template: `
    <div class="rounded-lg border border-[var(--color-border)] p-3 flex flex-col gap-3" data-testid="client-wallet">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div class="text-sm font-semibold">Stanje (uplate unapred i poklon kartice)</div>
          <div class="text-xl font-bold" data-testid="wallet-balance">{{ wallet()?.balance ?? 0 | rsd }}</div>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" appBtn theme="secondary" size="s" (click)="open('deposit')" data-testid="wallet-deposit">Uplata unapred</button>
          <button type="button" appBtn theme="secondary" size="s" (click)="open('gift')" data-testid="wallet-gift">Poklon kartica</button>
          @if (isManager()) {
            <button type="button" appBtn theme="ghost" size="s" (click)="open('adjust')" data-testid="wallet-adjust">Ispravka</button>
          }
        </div>
      </div>

      @if (mode(); as m) {
        <div class="flex flex-col gap-2 rounded-lg bg-[var(--color-bg)] p-3" data-testid="wallet-form">
          @if (m === 'gift') {
            <label class="text-sm font-semibold" for="wallet-code">Kod poklon kartice</label>
            <input id="wallet-code" appInput size="m" [formControl]="code" placeholder="npr. AB3K-9QXZ" autocomplete="off" data-testid="wallet-code" />
            <span class="text-xs muted">Ceo iznos kartice prelazi na stanje klijenta.</span>
          } @else {
            <label class="text-sm font-semibold" for="wallet-amount">{{ m === 'adjust' ? 'Iznos (minus = umanjenje)' : 'Iznos' }}</label>
            <input id="wallet-amount" appInput size="m" type="number" step="100" inputmode="numeric" [formControl]="amount" data-testid="wallet-amount" />
            @if (m === 'deposit') {
              <div class="chip-group">
                @for (pm of methods; track pm.value) {
                  <button type="button" class="chip" [class.selected]="method() === pm.value" (click)="method.set(pm.value)" [attr.data-testid]="'wallet-method-' + pm.value">{{ pm.label }}</button>
                }
              </div>
            }
            <input appInput size="m" [formControl]="note" [placeholder]="m === 'adjust' ? 'Razlog ispravke (obavezno)' : 'Napomena (nije obavezno)'" data-testid="wallet-note" />
          }
          <div class="flex gap-2">
            <button type="button" appBtn size="s" [disabled]="saving()" (click)="save(m)" data-testid="wallet-save">{{ m === 'gift' ? 'Iskoristi karticu' : 'Sačuvaj' }}</button>
            <button type="button" appBtn theme="ghost" size="s" (click)="mode.set(null)">Odustani</button>
          </div>
        </div>
      }

      @if (entries().length > 0) {
        <div class="flex flex-col text-sm" data-testid="wallet-entries">
          @for (e of shown(); track e.id) {
            <div class="flex items-start justify-between gap-3 py-1.5 border-t border-[var(--color-border)]">
              <div class="min-w-0">
                <div>{{ kindLabel(e) }}{{ e.payment_method ? ' · ' + paymentLabel(e) : '' }}{{ e.gift_card ? ' · ' + e.gift_card.code : '' }}</div>
                <div class="text-xs muted">{{ e.created_at | srDateTime }}{{ e.author ? ' · ' + e.author.first_name : '' }}{{ e.note ? ' · ' + e.note : '' }}</div>
              </div>
              <span class="font-semibold shrink-0" [class.text-[var(--color-success)]]="e.amount > 0">{{ e.amount > 0 ? '+' : '' }}{{ e.amount | rsd }}</span>
            </div>
          }
          @if (entries().length > shown().length) {
            <button type="button" appBtn theme="ghost" size="s" class="self-start" (click)="showAll.set(true)">Prikaži sve ({{ entries().length }})</button>
          }
        </div>
      }
    </div>
  `,
})
export class ClientWalletComponent implements OnInit {
  private walletService = inject(WalletService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);

  readonly clientId = input.required<number>();

  readonly methods = PAYMENT_METHODS.filter((m) => m.value !== 'wallet');
  readonly wallet = signal<Wallet | null>(null);
  readonly mode = signal<Mode | null>(null);
  readonly method = signal<PaymentMethod | null>(null);
  readonly saving = signal(false);
  readonly showAll = signal(false);
  readonly amount = new FormControl<number | null>(null);
  readonly note = new FormControl('', { nonNullable: true });
  readonly code = new FormControl('', { nonNullable: true });
  readonly isManager = this.auth.isManager;
  readonly entries = computed(() => this.wallet()?.entries ?? []);
  readonly shown = computed(() => (this.showAll() ? this.entries() : this.entries().slice(0, 5)));

  ngOnInit(): void {
    this.walletService.forClient(this.clientId()).subscribe({ next: (w) => this.wallet.set(w), error: () => this.wallet.set({ balance: 0, entries: [] }) });
  }

  kindLabel(e: WalletEntry): string {
    return WALLET_KIND_LABELS[e.kind];
  }

  paymentLabel(e: WalletEntry): string {
    return e.payment_method ? PAYMENT_LABELS[e.payment_method] : '';
  }

  open(mode: Mode): void {
    this.mode.set(mode);
    this.amount.reset(null);
    this.note.reset('');
    this.code.reset('');
    this.method.set(null);
  }

  save(mode: Mode): void {
    const amount = Number(this.amount.value) || 0;
    if (mode === 'deposit' && (amount <= 0 || !this.method())) {
      this.toast.error('Upiši iznos i izaberi kako je uplaćeno.');
      return;
    }
    if (mode === 'adjust' && (amount === 0 || !this.note.value.trim())) {
      this.toast.error('Upiši iznos i razlog ispravke.');
      return;
    }
    if (mode === 'gift' && !this.code.value.trim()) {
      this.toast.error('Upiši kod poklon kartice.');
      return;
    }
    const id = this.clientId();
    const request =
      mode === 'deposit'
        ? this.walletService.deposit(id, amount, this.method()!, this.note.value.trim() || null)
        : mode === 'adjust'
          ? this.walletService.adjust(id, amount, this.note.value.trim())
          : this.walletService.redeemForClient(id, this.code.value.trim());
    this.saving.set(true);
    request.subscribe({
      next: (w) => {
        this.saving.set(false);
        this.wallet.set(w);
        this.mode.set(null);
        this.toast.success(mode === 'gift' ? 'Poklon kartica je iskorišćena — iznos je na stanju.' : 'Stanje je ažurirano.');
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(apiErrorMessage(err, 'Nije uspelo.'));
      },
    });
  }
}
