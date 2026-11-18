import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { PAYMENT_LABELS, PAYMENT_METHODS, PaymentMethod } from '../../../core/models/payment.model';
import { GIFT_CARD_STATUS, GiftCard, GiftCardStatus, formatGiftCode } from '../../../core/models/wallet.model';
import { AuthService } from '../../../core/services/auth.service';
import { BusinessSettingService } from '../../../core/services/business-setting.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { WalletService } from '../../../core/services/wallet.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { addDays, today } from '../../../core/utils/dates';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { InfoTipComponent } from '../../../shared/components/info-tip/info-tip.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { RowAction, RowActionsComponent } from '../../../shared/components/row-actions/row-actions.component';
import { ButtonDirective } from '../../../shared/directives/button.directive';
import { IconDirective } from '../../../shared/directives/icon.directive';
import { InputDirective } from '../../../shared/directives/input.directive';
import { ClientNamePipe } from '../../../shared/pipes/client-name.pipe';
import { RsdPipe } from '../../../shared/pipes/rsd.pipe';
import { SrDatePipe } from '../../../shared/pipes/sr-date.pipe';

@Component({
  selector: 'app-gift-cards',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, ButtonDirective, ErrorMessageComponent, IconDirective, InfoTipComponent, InputDirective, ModalComponent, RowActionsComponent, ClientNamePipe, RsdPipe, SrDatePipe],
  templateUrl: './gift-cards.component.html',
})
export class GiftCardsComponent {
  private wallet = inject(WalletService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private auth = inject(AuthService);
  private business = inject(BusinessSettingService);

  readonly statusInfo = GIFT_CARD_STATUS;
  readonly methods = PAYMENT_METHODS.filter((m) => m.value !== 'wallet');
  readonly quickAmounts = [2000, 3000, 5000, 10000];
  readonly filters: { value: GiftCardStatus | null; label: string }[] = [
    { value: 'active', label: 'Aktivne' },
    { value: null, label: 'Sve' },
    { value: 'redeemed', label: 'Iskorišćene' },
    { value: 'expired', label: 'Istekle' },
  ];

  readonly cards = signal<GiftCard[]>([]);
  readonly loading = signal(true);
  readonly status = signal<GiftCardStatus | null>('active');
  readonly searchTerm = signal('');
  readonly search = new FormControl('', { nonNullable: true });
  readonly formOpen = signal(false);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly sold = signal<GiftCard | null>(null);
  readonly method = signal<PaymentMethod | null>(null);
  readonly amount = new FormControl<number | null>(null);
  readonly buyer = new FormControl('', { nonNullable: true });
  readonly recipient = new FormControl('', { nonNullable: true });
  readonly note = new FormControl('', { nonNullable: true });
  readonly expires = new FormControl('', { nonNullable: true });
  readonly minDate = today();
  readonly activeTotal = computed(() => this.cards().filter((c) => c.status === 'active').reduce((sum, c) => sum + c.amount, 0));

  constructor() {
    this.search.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed()).subscribe((v) => this.searchTerm.set(v.trim()));
    effect(() => {
      const status = this.status();
      const search = this.searchTerm();
      untracked(() => this.load(status, search));
    });
  }

  code(card: GiftCard): string {
    return formatGiftCode(card.code);
  }

  paymentLabel(card: GiftCard): string {
    return PAYMENT_LABELS[card.payment_method];
  }

  actions(card: GiftCard): RowAction[] {
    const list: RowAction[] = [
      { id: 'copy', label: 'Kopiraj kod', icon: 'copy' },
      { id: 'print', label: 'Štampaj', icon: 'file-text' },
    ];
    if (card.status === 'active' && this.auth.isManager()) list.push({ id: 'cancel', label: 'Poništi', icon: 'x-circle', danger: true });
    return list;
  }

  onAction(card: GiftCard, action: string): void {
    if (action === 'copy') this.copy(card);
    if (action === 'print') this.print(card);
    if (action === 'cancel') void this.cancel(card);
  }

  openForm(): void {
    this.amount.reset(null);
    this.buyer.reset('');
    this.recipient.reset('');
    this.note.reset('');
    this.expires.reset(addDays(today(), 365));
    this.method.set(null);
    this.formError.set(null);
    this.formOpen.set(true);
  }

  save(): void {
    const amount = Number(this.amount.value) || 0;
    if (amount < 100 || !this.method()) {
      this.formError.set('Upiši iznos (najmanje 100 din.) i izaberi kako je plaćeno.');
      return;
    }
    this.saving.set(true);
    this.formError.set(null);
    this.wallet
      .sellGiftCard({
        amount,
        payment_method: this.method()!,
        buyer_name: this.buyer.value.trim() || null,
        recipient_name: this.recipient.value.trim() || null,
        note: this.note.value.trim() || null,
        expires_on: this.expires.value || null,
      })
      .subscribe({
        next: (card) => {
          this.saving.set(false);
          this.formOpen.set(false);
          this.sold.set(card);
          this.load(this.status(), this.searchTerm());
        },
        error: (err) => {
          this.saving.set(false);
          this.formError.set(apiErrorMessage(err, 'Poklon kartica nije sačuvana.'));
        },
      });
  }

  copy(card: GiftCard): void {
    void navigator.clipboard?.writeText(this.code(card)).then(
      () => this.toast.success('Kod je kopiran.'),
      () => this.toast.info(this.code(card)),
    );
  }

  print(card: GiftCard): void {
    const win = window.open('', '_blank', 'width=480,height=640');
    if (!win) return;
    const esc = (v: string) => v.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
    const name = esc(this.business.name());
    const to = card.recipient_name ? `<p class="to">Za: ${esc(card.recipient_name)}</p>` : '';
    const note = card.note ? `<p class="note">${esc(card.note)}</p>` : '';
    const until = card.expires_on ? `<p class="small">Važi do ${card.expires_on.split('-').reverse().join('.')}.</p>` : '';
    const amount = `${card.amount.toLocaleString('sr-RS')} din.`;
    win.document.write(`<!doctype html><html lang="sr"><head><meta charset="utf-8"><title>Poklon kartica</title><style>
      body{font-family:system-ui,sans-serif;margin:0;display:flex;justify-content:center;padding:24px}
      .card{border:2px solid #333;border-radius:16px;padding:28px;width:340px;text-align:center}
      h1{font-size:20px;margin:0 0 4px} .label{letter-spacing:.2em;text-transform:uppercase;font-size:12px;color:#666}
      .amount{font-size:40px;font-weight:700;margin:16px 0} .code{font-family:monospace;font-size:26px;letter-spacing:.12em;border:1px dashed #333;border-radius:8px;padding:8px;margin:12px 0}
      .to{font-size:18px;margin:8px 0} .note{font-style:italic} .small{font-size:12px;color:#666}
    </style></head><body><div class="card"><div class="label">Poklon kartica</div><h1>${name}</h1>${to}<div class="amount">${amount}</div>${note}<div class="code">${this.code(card)}</div><p class="small">Kod se unosi pri zakazivanju u profilu ili ga pokažite u salonu.</p>${until}</div></body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  private async cancel(card: GiftCard): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Poništavanje poklon kartice',
      message: `Poništiti karticu ${this.code(card)} (${card.amount.toLocaleString('sr-RS')} din.)? Kod više neće moći da se iskoristi. Novac kupcu vraćaš posebno.`,
      confirmLabel: 'Poništi',
      cancelLabel: 'Ne',
    });
    if (!ok) return;
    this.wallet.cancelGiftCard(card.id).subscribe({
      next: () => {
        this.toast.success('Kartica je poništena.');
        this.load(this.status(), this.searchTerm());
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Poništavanje nije uspelo.')),
    });
  }

  private load(status: GiftCardStatus | null, search: string): void {
    this.loading.set(true);
    this.wallet.giftCards(status, search || null).subscribe({
      next: (cards) => {
        this.cards.set(cards);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(apiErrorMessage(err, 'Učitavanje nije uspelo.'));
      },
    });
  }
}
