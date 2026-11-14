import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Appointment, STATUS_LABELS } from '../../core/models/appointment.model';
import { BookingService } from '../../core/services/booking.service';
import { CancellationPreview, CancellationStatus } from '../../core/models/cancellation-fee.model';
import { CancellationFeeService } from '../../core/services/cancellation-fee.service';
import { LateCancelDialogComponent } from './late-cancel-dialog.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { BusinessSettingService } from '../../core/services/business-setting.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { apiErrorMessage } from '../../core/utils/api-error';
import { isoDate, monthLabel, monthShort, parseDate, timeOf, today, weekdayShort } from '../../core/utils/dates';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { MonthCalendarComponent, MonthCalendarItem } from '../../shared/components/month-calendar/month-calendar.component';
import { ButtonDirective } from '../../shared/directives/button.directive';
import { IconDirective } from '../../shared/directives/icon.directive';
import { RsdPipe } from '../../shared/pipes/rsd.pipe';
import { PaymentDialogComponent } from '../../shared/components/payment-dialog/payment-dialog.component';
import { WaitlistEntry, WaitlistService } from '../../core/services/waitlist.service';
import { StarsComponent } from '../../shared/components/stars/stars.component';
import { RescheduleComponent } from './reschedule.component';
import { ReviewFormComponent } from './review-form.component';
import { RealtimeService } from '../../core/services/realtime.service';

@Component({
  selector: 'app-my-appointments',
  standalone: true,
  imports: [RouterLink, ButtonDirective, ErrorMessageComponent, IconDirective, MonthCalendarComponent, LateCancelDialogComponent, ModalComponent, PaymentDialogComponent, RescheduleComponent, ReviewFormComponent, RsdPipe, StarsComponent],
  templateUrl: './my-appointments.component.html',
})
export class MyAppointmentsComponent {
  private booking = inject(BookingService);
  private realtime = inject(RealtimeService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  protected business = inject(BusinessSettingService);
  private fees = inject(CancellationFeeService);

  readonly lateCancel = signal<{ appointment: Appointment; preview: CancellationPreview; linkedIds: number[]; summary: string } | null>(null);
  readonly groupCancel = signal<{ members: Appointment[]; selected: number[] } | null>(null);
  readonly feeStatus = signal<CancellationStatus | null>(null);
  readonly feeEnabled = computed(() => this.business.settings()?.cancellation_fee_enabled ?? false);

  readonly statuses = STATUS_LABELS;
  readonly scope = signal<'upcoming' | 'past'>('upcoming');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly appointments = signal<Appointment[]>([]);
  readonly mode = signal<'list' | 'calendar'>('list');
  readonly rescheduling = signal<Appointment | null>(null);
  readonly paying = signal<Appointment | null>(null);
  readonly reviewing = signal<Appointment | null>(null);
  private waitlist = inject(WaitlistService);
  readonly waitlistEntries = signal<WaitlistEntry[]>([]);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private reviewTarget = Number(this.route.snapshot.queryParamMap.get('review')) || null;
  private rescheduleTarget = Number(this.route.snapshot.queryParamMap.get('reschedule')) || null;
  readonly visibleMonth = signal(today());
  readonly selectedDay = signal<string | null>(null);
  readonly allAppointments = signal<Appointment[]>([]);
  readonly monthTitle = computed(() => monthLabel(this.visibleMonth()));
  readonly monthItems = computed<MonthCalendarItem[]>(() =>
    this.allAppointments().map((a) => ({
      date: a.starts_at.slice(0, 10),
      label: `${timeOf(a.starts_at)} ${a.items[0]?.name ?? ''}`,
      muted: a.status === 'cancelled' || a.status === 'no_show',
    })),
  );
  readonly dayAppointments = computed(() => {
    const day = this.selectedDay();
    return day ? this.allAppointments().filter((a) => a.starts_at.startsWith(day)) : [];
  });
  readonly cancellationText = computed(() => {
    const days = this.business.settings()?.cancellation_days_before ?? 1;
    return days === 0 ? 'do početka termina' : days === 1 ? 'najkasnije dan pre termina' : `najkasnije ${days} dana pre termina`;
  });

  constructor() {
    effect(() => {
      if (this.realtime.version()) untracked(() => this.load(true));
    });
    if (this.reviewTarget) this.scope.set('past');
    this.load();
    this.loadWaitlist();
    this.loadFeeStatus();
  }

  loadFeeStatus(): void {
    this.fees.myStatus().subscribe({ next: (status) => this.feeStatus.set(status.enabled ? status : null), error: () => this.feeStatus.set(null) });
  }

  loadWaitlist(): void {
    this.waitlist.mine().subscribe({ next: (entries) => this.waitlistEntries.set(entries), error: () => this.waitlistEntries.set([]) });
  }

  waitlistDay(entry: WaitlistEntry): string {
    const d = parseDate(entry.date);
    return `${weekdayShort(entry.date)} ${d.getDate()}.${d.getMonth() + 1}.`;
  }

  async leaveWaitlist(entry: WaitlistEntry): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Lista čekanja', message: `Ukloniti prijavu za ${this.waitlistDay(entry)}?`, confirmLabel: 'Ukloni' });
    if (!ok) return;
    this.waitlist.leave(entry.id).subscribe({
      next: () => {
        this.waitlistEntries.update((list) => list.filter((e) => e.id !== entry.id));
        this.toast.success('Uklonjeno sa liste čekanja.');
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Uklanjanje nije uspelo.')),
    });
  }

  onReviewed(): void {
    this.reviewing.set(null);
    this.load();
  }

  onMoved(): void {
    this.rescheduling.set(null);
    this.load();
    if (this.mode() === 'calendar') this.loadAll();
  }

  setMode(mode: 'list' | 'calendar'): void {
    this.mode.set(mode);
    if (mode === 'calendar') this.loadAll();
  }

  stepMonth(direction: 1 | -1): void {
    const date = parseDate(this.visibleMonth().slice(0, 7) + '-01');
    date.setMonth(date.getMonth() + direction);
    this.visibleMonth.set(isoDate(date));
    this.selectedDay.set(null);
  }

  loadAll(): void {
    this.loading.set(true);
    let pending = 2;
    const merged: Appointment[] = [];
    const done = (list: Appointment[]) => {
      merged.push(...list);
      if (--pending === 0) {
        this.allAppointments.set(merged.sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
        this.loading.set(false);
        if (!this.selectedDay()) {
          const next = merged.find((a) => a.starts_at.slice(0, 10) >= today() && a.status !== 'cancelled');
          if (next) {
            this.selectedDay.set(next.starts_at.slice(0, 10));
            this.visibleMonth.set(next.starts_at.slice(0, 10));
          }
        }
      }
    };
    this.booking.mine('upcoming').subscribe({ next: done, error: () => done([]) });
    this.booking.mine('past').subscribe({ next: done, error: () => done([]) });
  }

  setScope(scope: 'upcoming' | 'past'): void {
    this.scope.set(scope);
    this.appointments.set([]);
    this.load();
  }

  load(quiet = false): void {
    this.loading.set(!quiet);
    this.error.set(null);
    this.booking.mine(this.scope(), quiet).subscribe({
      next: (list) => {
        this.appointments.set(list);
        this.loading.set(false);
        this.openReviewTarget(list);
        this.openRescheduleTarget(list);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'Učitavanje termina nije uspelo.'));
        this.loading.set(false);
      },
    });
  }

  private openRescheduleTarget(list: Appointment[]): void {
    if (!this.rescheduleTarget) return;
    const target = list.find((a) => a.id === this.rescheduleTarget);
    this.rescheduleTarget = null;
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
    if (target && (target.can_reschedule ?? target.can_cancel)) this.reschedule(target);
    else this.toast.info('Ovaj termin više ne može da se pomeri — javi nam se telefonom.');
  }

  private openReviewTarget(list: Appointment[]): void {
    if (!this.reviewTarget) return;
    const target = list.find((a) => a.id === this.reviewTarget);
    this.reviewTarget = null;
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
    if (target?.can_review) this.reviewing.set(target);
    else if (target?.review) this.toast.success('Ovaj termin je već ocenjen — hvala!');
  }

  weekday(a: Appointment): string {
    return weekdayShort(a.starts_at);
  }

  day(a: Appointment): number {
    return parseDate(a.starts_at).getDate();
  }

  month(a: Appointment): string {
    return monthShort(a.starts_at);
  }

  time(a: Appointment): string {
    return timeOf(a.starts_at);
  }

  serviceNames(a: Appointment): string {
    return a.items.map((i) => i.name).join(' + ');
  }

  linkedOf(a: Appointment): Appointment[] {
    if (!a.link_group) return [];
    const pool = this.mode() === 'calendar' ? this.allAppointments() : this.appointments();
    return pool
      .filter((x) => x.link_group === a.link_group && x.id !== a.id && (x.status === 'pending' || x.status === 'confirmed'))
      .sort((x, y) => x.starts_at.localeCompare(y.starts_at));
  }

  linkedLabel(a: Appointment): string {
    return this.linkedOf(a)
      .map((x) => `${x.starts_at < a.starts_at ? 'pre toga' : 'zatim'} u ${this.time(x)}: ${this.serviceNames(x)}${x.staff_member ? ' · ' + x.staff_member.first_name : ''}`)
      .join('; ');
  }

  reschedule(a: Appointment): void {
    this.rescheduling.set([a, ...this.linkedOf(a)].sort((x, y) => x.starts_at.localeCompare(y.starts_at))[0]);
  }

  async cancel(a: Appointment): Promise<void> {
    const linked = this.linkedOf(a).filter((x) => x.can_cancel);
    if (linked.length) {
      const members = [a, ...linked].sort((x, y) => x.starts_at.localeCompare(y.starts_at));
      this.groupCancel.set({ members, selected: members.map((m) => m.id) });
      return;
    }
    if (a.late_cancel) {
      this.previewLate([a]);
      return;
    }
    await this.confirmCancel(a);
  }

  toggleGroupMember(id: number): void {
    this.groupCancel.update((g) => (g ? { ...g, selected: g.selected.includes(id) ? g.selected.filter((x) => x !== id) : [...g.selected, id] } : g));
  }

  confirmGroupCancel(): void {
    const group = this.groupCancel();
    if (!group) return;
    const chosen = group.members.filter((m) => group.selected.includes(m.id));
    if (!chosen.length) {
      this.toast.info('Označi bar jedan termin koji otkazuješ.');
      return;
    }
    this.groupCancel.set(null);
    if (chosen.some((m) => m.late_cancel)) this.previewLate(chosen);
    else this.doCancel(chosen[0], false, chosen.slice(1).map((m) => m.id));
  }

  cancelSummary(a: Appointment): string {
    return `${this.serviceNames(a)}, ${this.weekday(a)} ${this.day(a)}. u ${this.time(a)}.`;
  }

  confirmLateCancel(): void {
    const target = this.lateCancel();
    this.lateCancel.set(null);
    if (target) this.doCancel(target.appointment, true, target.linkedIds);
  }

  private previewLate(chosen: Appointment[]): void {
    const [first, ...rest] = chosen;
    const linkedIds = rest.map((m) => m.id);
    this.fees.previewForClient(first.id, linkedIds).subscribe({
      next: (preview) => {
        if (preview.late) {
          this.lateCancel.set({ appointment: first, preview, linkedIds, summary: chosen.map((m) => this.cancelSummary(m)).join(' ') });
        } else if (rest.length) {
          this.doCancel(first, false, linkedIds);
        } else {
          this.confirmCancel(first);
        }
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Otkazivanje nije uspelo.')),
    });
  }

  private async confirmCancel(a: Appointment): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Otkazivanje termina',
      message: `Otkazati ${this.serviceNames(a)} (${this.weekday(a)} ${this.day(a)}. u ${this.time(a)})?`,
      confirmLabel: 'Otkaži termin',
      cancelLabel: 'Ne',
    });
    if (!ok) return;
    this.doCancel(a, false);
  }

  private doCancel(a: Appointment, acceptLate: boolean, linkedIds: number[] = []): void {
    this.booking.cancelMine(a.id, acceptLate, linkedIds).subscribe({
      next: (res) => {
        const fee = res.cancellation_fee;
        const done = res.cancelled_ids.length > 1 ? 'Termini su otkazani.' : 'Termin je otkazan.';
        this.toast.success(fee && fee.amount > 0 ? `${done} Naknada od ${fee.amount.toLocaleString('sr-RS')} din. plaća se pri sledećem dolasku.` : done);
        this.load();
        this.loadFeeStatus();
        if (this.mode() === 'calendar') this.loadAll();
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Otkazivanje nije uspelo.')),
    });
  }
}
