import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { STATUS_LABELS } from '../../../core/models/appointment.model';
import { REPORT_PERIODS, Report, ReportChannel, ReportPeriod, ReportQuery } from '../../../core/models/report.model';
import { StaffMember } from '../../../core/models/staff.model';
import { AuthService } from '../../../core/services/auth.service';
import { ReportService } from '../../../core/services/report.service';
import { StaffService } from '../../../core/services/staff.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { addDays, isoDate, parseDate, today } from '../../../core/utils/dates';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { ButtonDirective } from '../../../shared/directives/button.directive';
import { IconDirective } from '../../../shared/directives/icon.directive';
import { InputDirective } from '../../../shared/directives/input.directive';
import { RsdPipe } from '../../../shared/pipes/rsd.pipe';
import { SrDatePipe } from '../../../shared/pipes/sr-date.pipe';

type Scope = 'summary' | 'staff';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [ButtonComponent, ButtonDirective, ErrorMessageComponent, IconDirective, InputDirective, RsdPipe, SrDatePipe],
  templateUrl: './report.component.html',
})
export class ReportComponent {
  private reportService = inject(ReportService);
  private staffService = inject(StaffService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);

  readonly periods = REPORT_PERIODS;
  readonly statuses = STATUS_LABELS;
  readonly ownStaffId = computed(() => (this.auth.isOwner() ? null : (this.auth.currentUser()?.staff_member_id ?? null)));
  readonly canChoose = computed(() => this.ownStaffId() === null);

  readonly scope = signal<Scope>('summary');
  readonly period = signal<ReportPeriod>('day');
  readonly date = signal(today());
  readonly staffId = signal<number | null>(null);
  readonly staff = signal<StaffMember[]>([]);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly report = signal<Report | null>(null);
  readonly busy = signal<'pdf' | ReportChannel | null>(null);

  readonly query = computed<ReportQuery>(() => ({
    period: this.period(),
    date: this.date(),
    staff_member_id: this.ownStaffId() ?? (this.scope() === 'staff' ? this.staffId() : null),
  }));

  readonly ready = computed(() => this.ownStaffId() !== null || this.scope() === 'summary' || this.staffId() !== null);

  constructor() {
    if (this.canChoose()) {
      this.staffService.list().subscribe((staff) => {
        this.staff.set(staff);
        this.staffId.set(staff.find((m) => m.active)?.id ?? staff[0]?.id ?? null);
      });
    }
    effect(() => {
      const query = this.query();
      if (this.ready()) untracked(() => this.load(query));
    });
  }

  setDate(value: string): void {
    if (value) this.date.set(value);
  }

  shift(direction: 1 | -1): void {
    const period = this.period();
    if (period === 'day') {
      this.date.update((d) => addDays(d, direction));
    } else if (period === 'week') {
      this.date.update((d) => addDays(d, 7 * direction));
    } else {
      const d = parseDate(this.date());
      this.date.set(isoDate(new Date(d.getFullYear(), d.getMonth() + direction, 1)));
    }
  }

  hours(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }

  openPdf(): void {
    const report = this.report();
    this.busy.set('pdf');
    this.reportService
      .openPdf(this.query(), `izvestaj-${report?.period.from ?? this.date()}.pdf`)
      .catch((err) => this.toast.error(apiErrorMessage(err, 'PDF nije napravljen.')))
      .finally(() => this.busy.set(null));
  }

  send(channel: ReportChannel): void {
    this.busy.set(channel);
    this.reportService.send(this.query(), channel).subscribe({
      next: (res) => {
        this.busy.set(null);
        this.toast.success(res.message);
      },
      error: (err) => {
        this.busy.set(null);
        this.toast.error(apiErrorMessage(err, 'Slanje nije uspelo.'));
      },
    });
  }

  private load(query: ReportQuery): void {
    this.loading.set(true);
    this.error.set(null);
    this.reportService.get(query).subscribe({
      next: (report) => {
        this.report.set(report);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'Izveštaj nije učitan.'));
        this.loading.set(false);
      },
    });
  }
}
