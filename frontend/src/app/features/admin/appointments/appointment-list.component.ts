import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { Appointment, AppointmentStatus, STATUS_LABELS } from '../../../core/models/appointment.model';
import { StaffMember } from '../../../core/models/staff.model';
import { AppointmentService } from '../../../core/services/appointment.service';
import { StaffService } from '../../../core/services/staff.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { addDays, longDate, timeOf, today } from '../../../core/utils/dates';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { RowAction, RowActionsComponent } from '../../../shared/components/row-actions/row-actions.component';
import { ButtonDirective } from '../../../shared/directives/button.directive';
import { IconDirective } from '../../../shared/directives/icon.directive';
import { InputDirective } from '../../../shared/directives/input.directive';
import { RsdPipe } from '../../../shared/pipes/rsd.pipe';
import { AppointmentActionsService } from './appointment-actions.service';
import { AppointmentFormComponent, AppointmentPrefill } from './appointment-form.component';

type Period = 'today' | 'tomorrow' | 'week' | 'month';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Danas' },
  { value: 'tomorrow', label: 'Sutra' },
  { value: 'week', label: '7 dana' },
  { value: 'month', label: '30 dana' },
];

@Component({
  selector: 'app-appointment-list',
  standalone: true,
  imports: [ReactiveFormsModule, AppointmentFormComponent, ButtonDirective, ErrorMessageComponent, IconDirective, InputDirective, RowActionsComponent, RsdPipe],
  templateUrl: './appointment-list.component.html',
})
export class AppointmentListComponent {
  private appointmentService = inject(AppointmentService);
  private staffService = inject(StaffService);
  private appointmentActions = inject(AppointmentActionsService);
  private destroyRef = inject(DestroyRef);

  readonly periods = PERIODS;
  readonly statuses = STATUS_LABELS;
  readonly statusOptions = Object.entries(STATUS_LABELS).map(([value, s]) => ({ value: value as AppointmentStatus, label: s.label }));

  readonly period = signal<Period>('week');
  readonly staffFilter = signal<number | null>(null);
  readonly statusFilter = signal<AppointmentStatus | null>(null);
  readonly search = new FormControl('', { nonNullable: true });
  readonly searchTerm = signal('');

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly appointments = signal<Appointment[]>([]);
  readonly staff = signal<StaffMember[]>([]);

  readonly range = computed(() => {
    const start = today();
    switch (this.period()) {
      case 'today':
        return { from: start, to: start };
      case 'tomorrow':
        return { from: addDays(start, 1), to: addDays(start, 1) };
      case 'week':
        return { from: start, to: addDays(start, 6) };
      case 'month':
        return { from: start, to: addDays(start, 29) };
    }
  });

  readonly groups = computed(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of this.appointments()) {
      const key = a.starts_at.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), a]);
    }
    return [...map.entries()].map(([date, items]) => ({
      date,
      label: date === today() ? `Danas · ${longDate(date)}` : longDate(date),
      items,
      revenue: items.filter((a) => a.status !== 'cancelled' && a.status !== 'no_show').reduce((sum, a) => sum + a.total, 0),
    }));
  });

  readonly modalOpen = signal(false);
  readonly prefill = signal<AppointmentPrefill>({});

  constructor() {
    this.staffService.list().subscribe((staff) => this.staff.set(staff));
    this.appointmentService.refreshPendingCount();

    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.searchTerm.set(value.trim()));

    effect(() => {
      const filters = { ...this.range(), staff_member_id: this.staffFilter(), status: this.statusFilter(), search: this.searchTerm() || null };
      untracked(() => this.load(filters));
    });
  }

  reload(): void {
    this.load({ ...this.range(), staff_member_id: this.staffFilter(), status: this.statusFilter(), search: this.searchTerm() || null });
  }

  startTime(a: Appointment): string {
    return timeOf(a.starts_at);
  }

  endTime(a: Appointment): string {
    return timeOf(a.ends_at);
  }

  serviceNames(a: Appointment): string {
    return a.items.map((i) => i.name).join(' + ');
  }

  actions(a: Appointment): RowAction[] {
    return this.appointmentActions.actions(a);
  }

  async onAction(a: Appointment, action: string): Promise<void> {
    if (await this.appointmentActions.run(a, action)) this.reload();
  }

  openForm(): void {
    this.prefill.set({ date: this.period() === 'tomorrow' ? addDays(today(), 1) : today() });
    this.modalOpen.set(true);
  }

  onSaved(): void {
    this.modalOpen.set(false);
    this.reload();
  }

  private load(filters: { from: string; to: string; staff_member_id: number | null; status: AppointmentStatus | null; search: string | null }): void {
    this.loading.set(true);
    this.error.set(null);
    this.appointmentService.list(filters).subscribe({
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

}
