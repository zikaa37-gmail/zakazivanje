import { waitLabel } from '../../../core/utils/processing';
import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ChatService } from '../../../core/services/chat.service';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Appointment, SERVICE_OUTCOMES, STATUS_LABELS } from '../../../core/models/appointment.model';
import { PAYMENT_LABELS, PAYMENT_METHODS, PaymentMethod } from '../../../core/models/payment.model';
import { ColleagueRef } from '../../../core/models/staff-absence.model';
import { StaffMember } from '../../../core/models/staff.model';
import { AppointmentService } from '../../../core/services/appointment.service';
import { BusinessSettingService } from '../../../core/services/business-setting.service';
import { PaymentService } from '../../../core/services/payment.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { contactChannels } from '../../../core/utils/contact';
import { longDate, timeOf } from '../../../core/utils/dates';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PaymentDialogComponent } from '../../../shared/components/payment-dialog/payment-dialog.component';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { TimePickerComponent } from '../../../shared/components/time-picker/time-picker.component';
import { ButtonDirective } from '../../../shared/directives/button.directive';
import { IconDirective } from '../../../shared/directives/icon.directive';
import { InputDirective } from '../../../shared/directives/input.directive';
import { RsdPipe } from '../../../shared/pipes/rsd.pipe';
import { SrDateTimePipe } from '../../../shared/pipes/sr-date-time.pipe';
import { ClientFeesComponent } from '../clients/client-fees.component';
import { AppointmentActionsService } from './appointment-actions.service';
import { ClientNicknameComponent } from '../../../shared/components/client-nickname/client-nickname.component';
import { clientName } from '../../../core/utils/client-name';

@Component({
  selector: 'app-appointment-details',
  standalone: true,
  imports: [ClientNicknameComponent, ReactiveFormsModule, ButtonComponent, ClientFeesComponent, ButtonDirective, IconDirective, InputDirective, ModalComponent, PaymentDialogComponent, RsdPipe, SpinnerComponent, SrDateTimePipe, TimePickerComponent],
  templateUrl: './appointment-details.component.html',
})
export class AppointmentDetailsComponent implements OnInit {
  readonly appointment = input.required<Appointment>();
  private router = inject(Router);
  protected chat = inject(ChatService);
  readonly staff = input<StaffMember[]>([]);
  readonly changed = output<void>();
  readonly refresh = output<void>();
  readonly closed = output<void>();

  private actionsService = inject(AppointmentActionsService);
  private appointmentService = inject(AppointmentService);
  private payments = inject(PaymentService);
  private toast = inject(ToastService);
  private business = inject(BusinessSettingService);

  readonly paymentMethods = PAYMENT_METHODS;
  readonly paymentLabel = (method: PaymentMethod | null) => (method ? PAYMENT_LABELS[method] : '');
  readonly showIps = signal(false);
  readonly canTakePayment = computed(() => {
    const a = this.appointment();
    if (['cancelled', 'no_show'].includes(a.status)) return false;
    return a.status === 'completed' ? (a.outstanding ?? 0) > 0 : a.total > 0;
  });
  readonly fullyPaid = computed(() => !!this.appointment().paid_at && (this.appointment().outstanding ?? 0) === 0);
  readonly outcomeLabel = computed(() => SERVICE_OUTCOMES.find((o) => o.value === this.appointment().service_outcome)?.label ?? '');
  readonly hasBankAccount = computed(() => !!this.business.settings()?.bank_account);
  readonly feeEnabled = computed(() => this.business.settings()?.cancellation_fee_enabled ?? false);

  readonly statuses = STATUS_LABELS;
  readonly moving = signal(false);
  readonly transferring = signal(false);
  readonly alternatives = signal<ColleagueRef[] | null>(null);
  readonly linked = signal<Appointment[]>([]);
  readonly startTime = computed(() => timeOf(this.appointment().starts_at));
  readonly saving = signal(false);
  readonly moveStaff = new FormControl<number | null>(null);
  readonly moveDate = new FormControl<string>('', { nonNullable: true });
  readonly moveTime = new FormControl<string | null>(null);
  readonly tip = new FormControl<number | null>(null);

  private readonly nicknameOverride = signal<{ value: string | null } | null>(null);
  readonly nickname = computed(() => {
    const override = this.nicknameOverride();
    return override ? override.value : (this.appointment().client?.nickname ?? null);
  });
  readonly clientLabel = computed(() => {
    const client = this.appointment().client;
    return client ? clientName({ ...client, nickname: this.nickname() }) : '';
  });

  readonly active = computed(() => ['pending', 'confirmed'].includes(this.appointment().status));
  readonly waiting = computed(() => waitLabel(this.appointment()));
  readonly when = computed(() => `${longDate(this.appointment().starts_at)} · ${timeOf(this.appointment().starts_at)} – ${timeOf(this.appointment().ends_at)}`);
  readonly eligibleStaff = computed(() => {
    const ids = this.appointment().items.map((i) => i.service_id).filter((id): id is number => id !== null);
    return this.staff().filter((m) => m.active && ids.every((id) => m.services.some((s) => s.id === id)));
  });
  readonly contacts = computed(() => contactChannels(this.appointment().client?.phone));
  readonly callHref = computed(() => this.contacts().find((c) => c.id === 'call')?.href ?? null);
  readonly messageLinks = computed(() => this.contacts().filter((c) => c.id !== 'call'));

  nicknameSaved(nickname: string | null): void {
    this.nicknameOverride.set({ value: nickname });
    this.refresh.emit();
  }

  ngOnInit(): void {
    const a = this.appointment();
    this.moveStaff.setValue(a.staff_member_id);
    this.moveDate.setValue(a.starts_at.slice(0, 10));
    this.moveTime.setValue(timeOf(a.starts_at));
    if (a.link_group) this.appointmentService.linked(a.id).subscribe({ next: (list) => this.linked.set(list), error: () => this.linked.set([]) });
  }

  linkedLine(other: Appointment): string {
    const relation = other.starts_at < this.appointment().starts_at ? 'Pre toga' : 'Zatim';
    return `${relation} u ${timeOf(other.starts_at)}: ${other.items.map((i) => i.name).join(' + ')} · ${other.staff_member?.first_name ?? ''} ${other.staff_member?.last_name ?? ''}`.trim();
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

  toggleTransfer(): void {
    this.transferring.update((open) => !open);
    if (!this.transferring()) return;
    this.alternatives.set(null);
    this.appointmentService.alternatives(this.appointment().id).subscribe({
      next: (list) => this.alternatives.set(list),
      error: (err) => {
        this.alternatives.set([]);
        this.toast.error(apiErrorMessage(err, 'Učitavanje kolega nije uspelo.'));
      },
    });
  }

  async transfer(colleague: ColleagueRef): Promise<void> {
    if (await this.actionsService.transfer(this.appointment(), colleague)) this.changed.emit();
  }

  messageClient(): void {
    const a = this.appointment();
    if (!a.client) return;
    void this.router.navigate(['/admin/chat'], { queryParams: { client: a.client.id, appointment: a.id, name: this.clientLabel() } });
  }

  async askClient(): Promise<void> {
    if (await this.actionsService.askClientToReschedule(this.appointment())) this.changed.emit();
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
