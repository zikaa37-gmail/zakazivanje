import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Appointment, STATUS_LABELS } from '../../core/models/appointment.model';
import { BookingService } from '../../core/services/booking.service';
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

@Component({
  selector: 'app-my-appointments',
  standalone: true,
  imports: [RouterLink, ButtonDirective, ErrorMessageComponent, IconDirective, MonthCalendarComponent, RsdPipe],
  templateUrl: './my-appointments.component.html',
})
export class MyAppointmentsComponent {
  private booking = inject(BookingService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  protected business = inject(BusinessSettingService);

  readonly statuses = STATUS_LABELS;
  readonly scope = signal<'upcoming' | 'past'>('upcoming');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly appointments = signal<Appointment[]>([]);
  readonly mode = signal<'list' | 'calendar'>('list');
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
  readonly cancellationHours = computed(() => this.business.settings()?.cancellation_hours ?? 24);

  constructor() {
    this.load();
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

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.booking.mine(this.scope()).subscribe({
      next: (list) => {
        this.appointments.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'Učitavanje termina nije uspelo.'));
        this.loading.set(false);
      },
    });
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

  async cancel(a: Appointment): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Otkazivanje termina',
      message: `Otkazati ${this.serviceNames(a)} (${this.weekday(a)} ${this.day(a)}. u ${this.time(a)})?`,
      confirmLabel: 'Otkaži termin',
      cancelLabel: 'Ne',
    });
    if (!ok) return;

    this.booking.cancelMine(a.id).subscribe({
      next: () => {
        this.toast.success('Termin je otkazan.');
        this.load();
        if (this.mode() === 'calendar') this.loadAll();
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Otkazivanje nije uspelo.')),
    });
  }
}
