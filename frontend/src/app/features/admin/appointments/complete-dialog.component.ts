import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { PAYMENT_METHODS, PaymentMethod } from '../../../core/models/payment.model';
import { AppointmentService } from '../../../core/services/appointment.service';
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

type Choice = PaymentMethod | 'later';

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

  readonly methods = PAYMENT_METHODS;
  readonly choice = signal<Choice | null>(null);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly tip = new FormControl<number | null>(null);
  readonly note = new FormControl('', { nonNullable: true });

  readonly appointment = this.completion.request;
  readonly alreadyPaid = computed(() => !!this.appointment()?.paid_at);
  readonly time = computed(() => {
    const a = this.appointment();
    return a ? timeOf(a.starts_at) : '';
  });
  readonly services = computed(() => (this.appointment()?.items ?? []).map((i) => i.name).join(', '));
  readonly paidLabel = computed(() => PAYMENT_METHODS.find((m) => m.value === this.appointment()?.payment_method)?.label ?? '');
  readonly confirmLabel = computed(() => {
    if (this.alreadyPaid()) return 'Odrađeno';
    const choice = this.choice();
    if (choice === null) return 'Izaberi naplatu';
    return choice === 'later' ? 'Odrađeno, naplata kasnije' : 'Odrađeno i naplaćeno';
  });

  constructor() {
    effect(() => {
      const a = this.appointment();
      untracked(() => {
        this.choice.set(null);
        this.error.set(null);
        this.tip.reset(a?.tip ? a.tip : null);
        this.note.reset(a?.completion_note ?? '');
      });
    });
  }

  choose(choice: Choice): void {
    this.choice.set(choice);
  }

  cancel(): void {
    this.completion.finish(false);
  }

  save(): void {
    const a = this.appointment();
    if (!a) return;
    const choice = this.choice();
    if (!this.alreadyPaid() && choice === null) {
      this.error.set('Izaberi kako je plaćeno ili „Naplata kasnije“.');
      return;
    }
    const method = this.alreadyPaid() || choice === 'later' ? null : choice;
    this.saving.set(true);
    this.error.set(null);
    this.appointments.complete(a.id, method, Math.max(0, Number(this.tip.value) || 0), this.note.value.trim()).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(method || this.alreadyPaid() ? 'Termin je odrađen i naplaćen.' : 'Termin je odrađen. Naplata je ostala otvorena.');
        this.completion.finish(true);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(err, 'Čuvanje nije uspelo.'));
      },
    });
  }
}
