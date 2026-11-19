import { Component, computed, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { PAYMENT_LABELS, PAYMENT_METHODS, PaymentMethod } from '../../../core/models/payment.model';
import { GIFT_CARD_STATUS, GiftCard, GiftCardCheck, GiftCardKind, GiftCardStatus, formatGiftCode } from '../../../core/models/wallet.model';
import { AuthService } from '../../../core/services/auth.service';
import { BusinessSettingService } from '../../../core/services/business-setting.service';
import { ClientDirectoryService } from '../../../core/services/client-directory.service';
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
import { SelectSearchComponent } from '../../../shared/components/select-search/select-search.component';
import { ButtonDirective } from '../../../shared/directives/button.directive';
import { IconDirective } from '../../../shared/directives/icon.directive';
import { InputDirective } from '../../../shared/directives/input.directive';
import { ClientNamePipe } from '../../../shared/pipes/client-name.pipe';
import { RsdPipe } from '../../../shared/pipes/rsd.pipe';
import { SrDatePipe } from '../../../shared/pipes/sr-date.pipe';
import { SrDateTimePipe } from '../../../shared/pipes/sr-date-time.pipe';

@Component({
  selector: 'app-gift-cards',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, ButtonDirective, ErrorMessageComponent, IconDirective, InfoTipComponent, InputDirective, ModalComponent, RowActionsComponent, SelectSearchComponent, ClientNamePipe, RsdPipe, SrDatePipe, SrDateTimePipe],
  templateUrl: './gift-cards.component.html',
})
export class GiftCardsComponent {
  private wallet = inject(WalletService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private auth = inject(AuthService);
  private business = inject(BusinessSettingService);
  protected directory = inject(ClientDirectoryService);

  readonly statusInfo = GIFT_CARD_STATUS;
  readonly methods = PAYMENT_METHODS.filter((m) => m.value !== 'wallet' && m.value !== 'gift_card');
  readonly quickAmounts = [2000, 3000, 5000, 10000];
  readonly filters: { value: GiftCardStatus | null; label: string }[] = [
    { value: 'active', label: 'Aktivne' },
    { value: null, label: 'Sve' },
    { value: 'used', label: 'Potrošene' },
    { value: 'expired', label: 'Istekle' },
  ];

  readonly status = signal<GiftCardStatus | null>('active');
  readonly searchTerm = signal('');
  private readonly list = rxResource({
    params: () => ({ status: this.status(), search: this.searchTerm() }),
    stream: ({ params }) => this.wallet.giftCards(params.status, params.search || null),
  });
  readonly cards = computed<GiftCard[]>(() => (this.list.hasValue() ? this.list.value() : []));
  readonly loading = this.list.isLoading;
  readonly loadError = computed(() => (this.list.error() ? apiErrorMessage(this.list.error(), 'Učitavanje nije uspelo.') : null));
  readonly search = new FormControl('', { nonNullable: true });
  readonly formOpen = signal(false);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly sold = signal<GiftCard | null>(null);
  readonly checked = signal<GiftCardCheck | null>(null);
  readonly checkOpen = signal(false);
  readonly checkCode = new FormControl('', { nonNullable: true });
  readonly kind = signal<GiftCardKind>('digital');
  readonly method = signal<PaymentMethod | null>(null);
  readonly owner = new FormControl<number | null>(null);
  readonly amount = new FormControl<number | null>(null);
  readonly cardNumber = new FormControl('', { nonNullable: true });
  readonly buyer = new FormControl('', { nonNullable: true });
  readonly recipient = new FormControl('', { nonNullable: true });
  readonly note = new FormControl('', { nonNullable: true });
  readonly expires = new FormControl('', { nonNullable: true });
  readonly minDate = today();
  readonly activeTotal = computed(() => this.cards().filter((c) => c.status === 'active').reduce((sum, c) => sum + c.balance, 0));

  constructor() {
    this.search.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed()).subscribe((v) => this.searchTerm.set(v.trim()));
  }

  code(card: { code: string }): string {
    return formatGiftCode(card.code);
  }

  paymentLabel(card: GiftCard): string {
    return PAYMENT_LABELS[card.payment_method];
  }

  actions(card: GiftCard): RowAction[] {
    const list: RowAction[] = [
      { id: 'check', label: 'Stanje i korišćenje', icon: 'file-search' },
      { id: 'copy', label: 'Kopiraj kod', icon: 'copy' },
      { id: 'print', label: 'Štampaj', icon: 'file-text' },
    ];
    if (card.status === 'active' && card.balance === card.amount && this.auth.isManager()) list.push({ id: 'cancel', label: 'Poništi', icon: 'x-circle', danger: true });
    return list;
  }

  onAction(card: GiftCard, action: string): void {
    if (action === 'check') this.check(card.code);
    if (action === 'copy') this.copy(card);
    if (action === 'print') this.print(card);
    if (action === 'cancel') void this.cancel(card);
  }

  openForm(): void {
    this.directory.ensure();
    this.kind.set('digital');
    this.owner.reset(null);
    this.amount.reset(null);
    this.cardNumber.reset('');
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
    if (this.kind() === 'digital' && !this.owner.value) {
      this.formError.set('Izaberi klijenta kome se poklanja (ili izaberi fizičku karticu).');
      return;
    }
    this.saving.set(true);
    this.formError.set(null);
    this.wallet
      .sellGiftCard({
        kind: this.kind(),
        owner_id: this.kind() === 'digital' ? this.owner.value : null,
        card_number: this.kind() === 'physical' ? this.cardNumber.value.trim() || null : null,
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
          this.list.reload();
        },
        error: (err) => {
          this.saving.set(false);
          this.formError.set(apiErrorMessage(err, 'Poklon kartica nije sačuvana.'));
        },
      });
  }

  openCheck(): void {
    this.checkCode.reset('');
    this.checked.set(null);
    this.checkOpen.set(true);
  }

  check(code: string): void {
    if (!code.trim()) return;
    this.wallet.checkGiftCard(code.trim()).subscribe({
      next: (card) => {
        this.checked.set(card);
        this.checkOpen.set(true);
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Kartica nije pronađena.')),
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
    </style></head><body><div class="card"><div class="label">Poklon kartica</div><h1>${name}</h1>${to}<div class="amount">${amount}</div>${note}<div class="code">${this.code(card)}</div><p class="small">Važi na donosioca, za celu ili deo usluge. Kod može da se doda na nalog u aplikaciji (Profil), pa kartica ne mora da se nosi.</p>${until}</div></body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  private async cancel(card: GiftCard): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Poništavanje poklon kartice',
      message: `Poništiti karticu ${this.code(card)} (${card.amount.toLocaleString('sr-RS')} din.)? Kod više neće moći da se koristi. Novac kupcu vraćaš posebno.`,
      confirmLabel: 'Poništi',
      cancelLabel: 'Ne',
    });
    if (!ok) return;
    this.wallet.cancelGiftCard(card.id).subscribe({
      next: () => {
        this.toast.success('Kartica je poništena.');
        this.list.reload();
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Poništavanje nije uspelo.')),
    });
  }
}
