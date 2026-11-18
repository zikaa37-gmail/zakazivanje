import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SERVICE_OUTCOMES, ServiceOutcome } from '../../../core/models/appointment.model';
import { PAYMENT_METHODS, PaymentMethod } from '../../../core/models/payment.model';
import { AppointmentService } from '../../../core/services/appointment.service';
import { WalletService } from '../../../core/services/wallet.service';
import { CompletionService } from '../../../core/services/completion.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { timeOf } from '../../../core/utils/dates';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { InputDirective } from '../../../shared/directives/input.directive';
import { ClientNamePipe } from '../../../shared/pipes/client-name.pipe';
import { RsdPipe } from '../../../shared/pipes/rsd.pipe';

type Payment = 'full' | 'partial' | 'none';

@Component({
  selector: 'app-complete-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, ErrorMessageComponent, ModalComponent, InputDirective, ClientNamePipe, RsdPipe],
  templateUrl: './complete-dialog.component.html',
})
export class CompleteDialogComponent {
  protected completion = inject(CompletionService);
  private appointments = inject(AppointmentService);
  private toast = inject(ToastService);
  private wallets = inject(WalletService);

  readonly outcomes = SERVICE_OUTCOMES;
  readonly methods = PAYMENT_METHODS.filter((m) => m.value !== 'wallet');
  readonly balance = signal(0);
  readonly payments: { value: Payment; label: string }[] = [
    { value: 'full', label: 'Plaćeno u celosti' },
    { value: 'partial', label: 'Delimično' },
    { value: 'none', label: 'Nije plaćeno' },
  ];

  readonly outcome = signal<ServiceOutcome>('done');
  readonly payment = signal<Payment | null>(null);
  readonly method = signal<PaymentMethod | null>(null);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly due = new FormControl<number | null>(null);
  readonly paidAmount = new FormControl<number | null>(null);
  readonly tip = new FormControl<number | null>(null);
  readonly note = new FormControl('', { nonNullable: true });
  private readonly dueValue = signal(0);
  private readonly noteValue = signal('');

  readonly appointment = this.completion.request;
  readonly time = computed(() => {
    const a = this.appointment();
    return a ? timeOf(a.starts_at) : '';
  });
  readonly services = computed(() => (this.appointment()?.items ?? []).map((i) => i.name).join(', '));
  readonly nothingDue = computed(() => this.dueValue() <= 0);
  readonly needsMethod = computed(() => !this.nothingDue() && (this.payment() === 'full' || this.payment() === 'partial'));
  readonly problem = computed(() => this.outcome() !== 'done' || (!this.nothingDue() && this.payment() !== 'full'));
  readonly ready = computed(() => {
    if (!this.nothingDue() && this.payment() === null) return false;
    if (this.needsMethod() && this.method() === null) return false;
    return !this.problem() || this.noteValue().trim().length > 0;
  });
  readonly confirmLabel = computed(() => {
    if (!this.nothingDue() && this.payment() === null) return 'Izaberi naplatu';
    if (this.needsMethod() && this.method() === null) return 'Izaberi način plaćanja';
    if (this.problem() && !this.noteValue().trim()) return 'Upiši belešku';
    return 'Sačuvaj';
  });

  constructor() {
    this.due.valueChanges.subscribe((v) => this.dueValue.set(Math.max(0, Number(v) || 0)));
    this.note.valueChanges.subscribe((v) => this.noteValue.set(v));
    effect(() => {
      const a = this.appointment();
      untracked(() => {
        this.error.set(null);
        this.outcome.set(a?.service_outcome ?? 'done');
        const dueBefore = a?.due_amount ?? a?.total ?? 0;
        const paidBefore = a?.paid_at ? (a.paid_amount ?? a.total) : 0;
        this.due.setValue(dueBefore);
        this.payment.set(a?.paid_at ? (paidBefore >= dueBefore ? 'full' : 'partial') : null);
        this.method.set(a?.payment_method ?? null);
        this.paidAmount.setValue(a?.paid_at && paidBefore < dueBefore ? paidBefore : null);
        this.tip.setValue(a?.tip ? a.tip : null);
        this.note.setValue(a?.completion_note ?? '');
        this.balance.set(0);
        if (a?.client_id) this.wallets.forClient(a.client_id).subscribe({ next: (w) => this.balance.set(w.balance), error: () => undefined });
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

  cancel(): void {
    this.completion.finish(false);
  }

  save(): void {
    const a = this.appointment();
    if (!a || !this.ready()) return;
    const payment: Payment = this.nothingDue() ? 'none' : this.payment()!;
    this.saving.set(true);
    this.error.set(null);
    this.appointments
      .complete(a.id, {
        service_outcome: this.outcome(),
        due_amount: this.dueValue(),
        payment,
        paid_amount: payment === 'partial' ? Math.max(0, Number(this.paidAmount.value) || 0) : null,
        payment_method: payment === 'none' ? null : this.method(),
        tip: payment === 'none' ? 0 : Math.max(0, Number(this.tip.value) || 0),
        note: this.note.value.trim() || null,
      })
      .subscribe({
        next: (saved) => {
          this.saving.set(false);
          const owed = saved.outstanding ?? 0;
          this.toast.success(owed > 0 ? `Sačuvano. Za naplatu ostaje ${owed.toLocaleString('sr-RS')} din.` : 'Termin je završen, naplata je zatvorena.');
          this.completion.finish(true);
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(apiErrorMessage(err, 'Čuvanje nije uspelo.'));
        },
      });
  }
}
