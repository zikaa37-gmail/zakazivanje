import { Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { PAYMENT_LABELS, PAYMENT_METHODS, PaymentMethod } from '../../../core/models/payment.model';
import { GIFT_CARD_STATUS, WALLET_KIND_LABELS, WalletEntry, formatGiftCode } from '../../../core/models/wallet.model';
import { IconDirective } from '../../../shared/directives/icon.directive';
import { SrDatePipe } from '../../../shared/pipes/sr-date.pipe';
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
  imports: [ReactiveFormsModule, ButtonDirective, IconDirective, InputDirective, RsdPipe, SrDatePipe, SrDateTimePipe],
  template: `
    <div class="rounded-lg border border-[var(--color-border)] p-3 flex flex-col gap-3" data-testid="client-wallet">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div class="text-sm font-semibold">Stanje (uplate unapred)</div>
          <div class="text-xl font-bold" data-testid="wallet-balance">{{ balance() | rsd }}</div>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" appBtn theme="secondary" size="s" (click)="open('deposit')" data-testid="wallet-deposit">Uplata unapred</button>
          <button type="button" appBtn theme="secondary" size="s" (click)="open('gift')" data-testid="wallet-gift">Dodaj poklon karticu</button>
          @if (isManager()) {
            <button type="button" appBtn theme="ghost" size="s" (click)="open('adjust')" data-testid="wallet-adjust">Ispravka</button>
          }
        </div>
      </div>

      @if (mode(); as m) {
        <div class="flex flex-col gap-2 rounded-lg bg-[var(--color-bg)] p-3" data-testid="wallet-form">
          @if (m === 'gift') {
            <label class="text-sm font-semibold" for="wallet-code">Kod poklon kartice</label>
            <input id="wallet-code" appInput size="m" [formControl]="codeInput" placeholder="npr. AB3K-9QXZ" autocomplete="off" data-testid="wallet-code" />
            <span class="text-xs muted">Fizička kartica postaje digitalna: vezuje se za nalog klijenta, on vidi njeno stanje i ne mora da je nosi.</span>
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
            <button type="button" appBtn size="s" [disabled]="saving()" (click)="save(m)" data-testid="wallet-save">{{ m === 'gift' ? 'Dodaj na nalog' : 'Sačuvaj' }}</button>
            <button type="button" appBtn theme="ghost" size="s" (click)="mode.set(null)">Odustani</button>
          </div>
        </div>
      }

      @if (cards().length > 0) {
        <div class="flex flex-col gap-1 text-sm" data-testid="wallet-cards">
          <div class="text-xs font-semibold muted">Poklon kartice</div>
          @for (c of cards(); track c.id) {
            <div class="flex items-center justify-between gap-2" [class.is-dimmed]="c.status !== 'active'">
              <span><span appIcon="gift" [iconSize]="14" aria-hidden="true"></span> <span class="font-mono">{{ code(c.code) }}</span> · {{ statusInfo[c.status].label.toLowerCase() }}{{ c.expires_on ? ' · do ' + (c.expires_on | srDate) : '' }}</span>
              <span class="font-semibold">{{ c.balance | rsd }} <span class="muted font-normal">/ {{ c.amount | rsd }}</span></span>
            </div>
          }
        </div>
      }

      @if (entries().length > 0) {
        <div class="flex flex-col text-sm" data-testid="wallet-entries">
          @for (e of shown(); track e.id) {
            <div class="flex items-start justify-between gap-3 py-1.5 border-t border-[var(--color-border)]">
              <div class="min-w-0">
                <div>{{ kindLabel(e) }}{{ e.payment_method ? ' · ' + paymentLabel(e) : '' }}</div>
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
export class ClientWalletComponent {
  private walletService = inject(WalletService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);

  readonly clientId = input.required<number>();

  readonly methods = PAYMENT_METHODS.filter((m) => m.value !== 'wallet' && m.value !== 'gift_card');
  readonly wallet = rxResource({ params: () => this.clientId(), stream: ({ params }) => this.walletService.forClient(params) });
  readonly mode = signal<Mode | null>(null);
  readonly method = signal<PaymentMethod | null>(null);
  readonly saving = signal(false);
  readonly showAll = signal(false);
  readonly amount = new FormControl<number | null>(null);
  readonly note = new FormControl('', { nonNullable: true });
  readonly codeInput = new FormControl('', { nonNullable: true });
  readonly isManager = this.auth.isManager;
  readonly statusInfo = GIFT_CARD_STATUS;
  readonly balance = computed(() => (this.wallet.hasValue() ? this.wallet.value().balance : 0));
  readonly cards = computed(() => (this.wallet.hasValue() ? this.wallet.value().gift_cards : []));
  readonly entries = computed(() => (this.wallet.hasValue() ? this.wallet.value().entries : []));
  readonly code = formatGiftCode;
  readonly shown = computed(() => (this.showAll() ? this.entries() : this.entries().slice(0, 5)));

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
    this.codeInput.reset('');
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
    if (mode === 'gift' && !this.codeInput.value.trim()) {
      this.toast.error('Upiši kod poklon kartice.');
      return;
    }
    const id = this.clientId();
    const request =
      mode === 'deposit'
        ? this.walletService.deposit(id, amount, this.method()!, this.note.value.trim() || null)
        : mode === 'adjust'
          ? this.walletService.adjust(id, amount, this.note.value.trim())
          : this.walletService.claimForClient(id, this.codeInput.value.trim());
    this.saving.set(true);
    request.subscribe({
      next: (w) => {
        this.saving.set(false);
        this.wallet.set(w);
        this.mode.set(null);
        this.toast.success(mode === 'gift' ? 'Poklon kartica je dodata na nalog klijenta.' : 'Stanje je ažurirano.');
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(apiErrorMessage(err, 'Nije uspelo.'));
      },
    });
  }
}
