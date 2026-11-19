import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SERVICE_OUTCOMES, ServiceOutcome } from '../../../core/models/appointment.model';
import { PAYMENT_METHODS, PaymentMethod } from '../../../core/models/payment.model';
import { OwnedGiftCard, formatGiftCode } from '../../../core/models/wallet.model';
import { AppointmentService } from '../../../core/services/appointment.service';
import { CompletionService } from '../../../core/services/completion.service';
import { ToastService } from '../../../core/services/toast.service';
import { WalletService } from '../../../core/services/wallet.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { timeOf } from '../../../core/utils/dates';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ButtonDirective } from '../../../shared/directives/button.directive';
import { InputDirective } from '../../../shared/directives/input.directive';
import { ClientNamePipe } from '../../../shared/pipes/client-name.pipe';
import { RsdPipe } from '../../../shared/pipes/rsd.pipe';

type Payment = 'full' | 'partial' | 'none';
type Rest = PaymentMethod | 'debt';

@Component({
  selector: 'app-complete-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, ButtonDirective, ErrorMessageComponent, ModalComponent, InputDirective, ClientNamePipe, RsdPipe],
  templateUrl: './complete-dialog.component.html',
})
export class CompleteDialogComponent {
  protected completion = inject(CompletionService);
  private appointments = inject(AppointmentService);
  private toast = inject(ToastService);
  private wallets = inject(WalletService);

  readonly outcomes = SERVICE_OUTCOMES;
  readonly methods = PAYMENT_METHODS.filter((m) => m.value !== 'wallet' && m.value !== 'gift_card');
  readonly payments: { value: Payment; label: string }[] = [
    { value: 'full', label: 'Plaćeno u celosti' },
    { value: 'partial', label: 'Delimično' },
    { value: 'none', label: 'Nije plaćeno' },
  ];
  readonly code = formatGiftCode;

  readonly outcome = signal<ServiceOutcome>('done');
  readonly payment = signal<Payment | null>(null);
  readonly method = signal<PaymentMethod | null>(null);
  readonly rest = signal<Rest | null>(null);
  readonly card = signal<{ code: string; balance: number } | null>(null);
  readonly checking = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly due = new FormControl<number | null>(null);
  readonly paidAmount = new FormControl<number | null>(null);
  readonly tip = new FormControl<number | null>(null);
  readonly note = new FormControl('', { nonNullable: true });
  readonly cardCode = new FormControl('', { nonNullable: true });
  private readonly dueValue = signal(0);
  private readonly paidValue = signal(0);
  private readonly noteValue = signal('');
  private readonly paidBefore = signal(0);

  readonly appointment = this.completion.request;
  private readonly clientWallet = rxResource({
    params: () => this.appointment()?.client_id ?? undefined,
    stream: ({ params }) => this.wallets.forClient(params),
  });
  readonly balance = computed(() => (this.clientWallet.hasValue() ? this.clientWallet.value().balance : 0));
  readonly clientCards = computed<OwnedGiftCard[]>(() => (this.clientWallet.hasValue() ? this.clientWallet.value().gift_cards : []));
  readonly time = computed(() => {
    const a = this.appointment();
    return a ? timeOf(a.starts_at) : '';
  });
  readonly services = computed(() => (this.appointment()?.items ?? []).map((i) => i.name).join(', '));
  readonly activeCards = computed(() => this.clientCards().filter((c) => c.status === 'active'));
  readonly nothingDue = computed(() => this.dueValue() <= 0);
  readonly needsMethod = computed(() => !this.nothingDue() && (this.payment() === 'full' || this.payment() === 'partial'));
  readonly giftMode = computed(() => this.needsMethod() && this.method() === 'gift_card');
  readonly target = computed(() => (this.payment() === 'full' ? this.dueValue() : this.payment() === 'partial' ? this.paidValue() : 0));
  readonly toCollect = computed(() => Math.max(0, Math.round((this.target() - this.paidBefore()) * 100) / 100));
  readonly fromCard = computed(() => Math.min(this.card()?.balance ?? 0, this.toCollect()));
  readonly restAmount = computed(() => Math.max(0, Math.round((this.toCollect() - this.fromCard()) * 100) / 100));
  readonly restIsDebt = computed(() => this.giftMode() && this.restAmount() > 0 && this.rest() === 'debt');
  readonly problem = computed(() => this.outcome() !== 'done' || (!this.nothingDue() && this.payment() !== 'full') || this.restIsDebt());
  readonly blocker = computed(() => {
    if (!this.nothingDue() && this.payment() === null) return 'Izaberi naplatu';
    if (this.needsMethod() && this.method() === null) return 'Izaberi način plaćanja';
    if (this.giftMode() && !this.card()) return 'Proveri karticu';
    if (this.giftMode() && this.fromCard() <= 0 && this.toCollect() > 0) return 'Na kartici nema sredstava';
    if (this.giftMode() && this.restAmount() > 0 && this.rest() === null) return 'Izaberi kako je plaćen ostatak';
    if (this.problem() && !this.noteValue().trim()) return 'Upiši belešku';
    return null;
  });

  constructor() {
    this.due.valueChanges.subscribe((v) => this.dueValue.set(Math.max(0, Number(v) || 0)));
    this.paidAmount.valueChanges.subscribe((v) => this.paidValue.set(Math.max(0, Number(v) || 0)));
    this.note.valueChanges.subscribe((v) => this.noteValue.set(v));
    effect(() => {
      const a = this.appointment();
      untracked(() => {
        this.error.set(null);
        this.outcome.set(a?.service_outcome ?? 'done');
        const dueBefore = a?.due_amount ?? a?.total ?? 0;
        const paidBefore = a?.paid_at ? (a.paid_amount ?? a.total) : 0;
        this.paidBefore.set(paidBefore);
        this.due.setValue(dueBefore);
        this.payment.set(a?.paid_at ? (paidBefore >= dueBefore ? 'full' : 'partial') : null);
        this.method.set(null);
        this.rest.set(null);
        this.card.set(null);
        this.cardCode.reset('');
        this.paidAmount.setValue(a?.paid_at && paidBefore < dueBefore ? paidBefore : null);
        this.tip.setValue(a?.tip ? a.tip : null);
        this.note.setValue(a?.completion_note ?? '');
      });
    });
  }

  chooseOutcome(outcome: ServiceOutcome): void {
    this.outcome.set(outcome);
    if (outcome === 'not_done') {
      this.due.setValue(0);
      this.payment.set('none');
      this.method.set(null);
    } else if (outcome === 'done') {
      this.due.setValue(this.appointment()?.total ?? 0);
    }
  }

  choosePayment(payment: Payment): void {
    this.payment.set(payment);
    if (payment === 'none') this.method.set(null);
  }

  chooseMethod(method: PaymentMethod): void {
    this.method.set(method);
    this.rest.set(null);
  }

  useCard(code: string): void {
    this.cardCode.setValue(this.code(code));
    this.checkCard();
  }

  checkCard(): void {
    const code = this.cardCode.value.trim();
    if (!code) return;
    this.checking.set(true);
    this.card.set(null);
    this.error.set(null);
    this.wallets.checkGiftCard(code).subscribe({
      next: (card) => {
        this.checking.set(false);
        if (card.status !== 'active') {
          this.error.set(`Kartica ${this.code(card.code)} nije aktivna (${card.status === 'used' ? 'potrošena' : card.status === 'expired' ? 'istekla' : 'poništena'}).`);
          return;
        }
        this.card.set({ code: card.code, balance: card.balance });
      },
      error: (err) => {
        this.checking.set(false);
        this.error.set(apiErrorMessage(err, 'Kartica nije pronađena.'));
      },
    });
  }

  cancel(): void {
    this.completion.finish(false);
  }

  save(): void {
    const a = this.appointment();
    if (!a || this.blocker()) return;
    let payment: Payment = this.nothingDue() ? 'none' : this.payment()!;
    let paid: number | null = payment === 'partial' ? this.paidValue() : null;
    let method: PaymentMethod | null = payment === 'none' ? null : this.method();
    let giftCode: string | null = null;
    if (this.giftMode()) {
      giftCode = this.card()!.code;
      const restMethod = this.rest();
      method = this.restAmount() > 0 && restMethod && restMethod !== 'debt' ? restMethod : null;
      if (this.restAmount() > 0 && restMethod === 'debt') {
        const reached = Math.round((this.paidBefore() + this.fromCard()) * 100) / 100;
        payment = reached >= this.dueValue() ? 'full' : 'partial';
        paid = payment === 'partial' ? reached : null;
      }
    }
    this.saving.set(true);
    this.error.set(null);
    this.appointments
      .complete(a.id, {
        service_outcome: this.outcome(),
        due_amount: this.dueValue(),
        payment,
        paid_amount: paid,
        payment_method: method,
        gift_card_code: giftCode,
        tip: payment === 'none' ? 0 : Math.max(0, Number(this.tip.value) || 0),
        note: this.note.value.trim() || null,
      })
      .subscribe({
        next: (saved) => {
          this.saving.set(false);
          const owed = saved.outstanding ?? 0;
          const cardLeft = saved.gift_card_left !== undefined && saved.gift_card_left !== null ? ` Na kartici je ostalo ${saved.gift_card_left.toLocaleString('sr-RS')} din.` : '';
          this.toast.success((owed > 0 ? `Sačuvano. Za naplatu ostaje ${owed.toLocaleString('sr-RS')} din.` : 'Termin je završen, naplata je zatvorena.') + cardLeft);
          this.completion.finish(true);
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(apiErrorMessage(err, 'Čuvanje nije uspelo.'));
        },
      });
  }
}
