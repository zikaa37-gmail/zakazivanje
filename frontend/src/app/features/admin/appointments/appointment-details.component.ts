import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Appointment, STATUS_LABELS } from '../../../core/models/appointment.model';
import { PAYMENT_METHODS, PaymentMethod } from '../../../core/models/payment.model';
import { StaffMember } from '../../../core/models/staff.model';
import { BusinessSettingService } from '../../../core/services/business-setting.service';
import { PaymentService } from '../../../core/services/payment.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { contactChannels } from '../../../core/utils/contact';
import { longDate, timeOf } from '../../../core/utils/dates';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PaymentDialogComponent } from '../../../shared/components/payment-dialog/payment-dialog.component';
import { TimePickerComponent } from '../../../shared/components/time-picker/time-picker.component';
import { ButtonDirective } from '../../../shared/directives/button.directive';
import { IconDirective } from '../../../shared/directives/icon.directive';
import { InputDirective } from '../../../shared/directives/input.directive';
import { RsdPipe } from '../../../shared/pipes/rsd.pipe';
import { SrDateTimePipe } from '../../../shared/pipes/sr-date-time.pipe';
import { AppointmentActionsService } from './appointment-actions.service';

@Component({
  selector: 'app-appointment-details',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, ButtonDirective, IconDirective, InputDirective, ModalComponent, PaymentDialogComponent, RsdPipe, SrDateTimePipe, TimePickerComponent],
  templateUrl: './appointment-details.component.html',
})
export class AppointmentDetailsComponent implements OnInit {
  readonly appointment = input.required<Appointment>();
  readonly staff = input<StaffMember[]>([]);
  readonly changed = output<void>();
  readonly closed = output<void>();

  private actionsService = inject(AppointmentActionsService);
  private payments = inject(PaymentService);
  private toast = inject(ToastService);
  private business = inject(BusinessSettingService);

  readonly paymentMethods = PAYMENT_METHODS;
  readonly paymentLabel = (method: PaymentMethod | null) => PAYMENT_METHODS.find((m) => m.value === method)?.label ?? '';
  readonly showIps = signal(false);
  readonly canTakePayment = computed(() => this.appointment().total > 0 && !['cancelled', 'no_show'].includes(this.appointment().status));
  readonly hasBankAccount = computed(() => !!this.business.settings()?.bank_account);

  readonly statuses = STATUS_LABELS;
  readonly moving = signal(false);
  readonly saving = signal(false);
  readonly moveStaff = new FormControl<number | null>(null);
  readonly moveDate = new FormControl<string>('', { nonNullable: true });
  readonly moveTime = new FormControl<string | null>(null);
  readonly tip = new FormControl<number | null>(null);

  readonly active = computed(() => ['pending', 'confirmed'].includes(this.appointment().status));
  readonly when = computed(() => `${longDate(this.appointment().starts_at)} · ${timeOf(this.appointment().starts_at)} – ${timeOf(this.appointment().ends_at)}`);
  readonly eligibleStaff = computed(() => {
    const ids = this.appointment().items.map((i) => i.service_id).filter((id): id is number => id !== null);
    return this.staff().filter((m) => m.active && ids.every((id) => m.services.some((s) => s.id === id)));
  });
  readonly contacts = computed(() => contactChannels(this.appointment().client?.phone));
  readonly callHref = computed(() => this.contacts().find((c) => c.id === 'call')?.href ?? null);
  readonly messageLinks = computed(() => this.contacts().filter((c) => c.id !== 'call'));

  ngOnInit(): void {
    const a = this.appointment();
    this.moveStaff.setValue(a.staff_member_id);
    this.moveDate.setValue(a.starts_at.slice(0, 10));
    this.moveTime.setValue(timeOf(a.starts_at));
  }

  markPaid(method: PaymentMethod | null): void {
    this.payments.markPaid(this.appointment().id, method, Math.max(0, Number(this.tip.value) || 0)).subscribe({
      next: () => {
        this.toast.success(method ? `Naplaćeno: ${this.paymentLabel(method).toLowerCase()}.` : 'Plaćanje je poništeno.');
        this.changed.emit();
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Čuvanje plaćanja nije uspelo.')),
    });
  }

  async act(action: string): Promise<void> {
    if (await this.actionsService.run(this.appointment(), action)) this.changed.emit();
  }

  async move(): Promise<void> {
    const staffId = this.moveStaff.value;
    if (!staffId || !this.moveDate.value || !this.moveTime.value) return;
    this.saving.set(true);
    const moved = await this.actionsService.reschedule(this.appointment(), staffId, `${this.moveDate.value} ${this.moveTime.value}`, false);
    this.saving.set(false);
    if (moved) this.changed.emit();
  }
}
