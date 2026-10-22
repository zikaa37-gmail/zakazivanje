import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Appointment, STATUS_LABELS } from '../../../core/models/appointment.model';
import { StaffMember } from '../../../core/models/staff.model';
import { AppointmentService } from '../../../core/services/appointment.service';
import { DashboardService, DashboardStats, DashboardToday } from '../../../core/services/dashboard.service';
import { StaffService } from '../../../core/services/staff.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { addDays, longDate, parseDate, timeOf, today, weekdayShort } from '../../../core/utils/dates';
import { ColumnChartComponent, ColumnPoint } from '../../../shared/components/column-chart/column-chart.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { ButtonDirective } from '../../../shared/directives/button.directive';
import { IconDirective } from '../../../shared/directives/icon.directive';
import { RsdPipe } from '../../../shared/pipes/rsd.pipe';
import { AppointmentDetailsComponent } from '../appointments/appointment-details.component';

type Period = '7' | '30' | '90' | 'month';

interface Tile {
  key: string;
  label: string;
  value: string;
  delta: string | null;
  tone: 'good' | 'bad' | 'neutral';
}

const PERIODS: { value: Period; label: string }[] = [
  { value: '7', label: '7 dana' },
  { value: '30', label: '30 dana' },
  { value: '90', label: '90 dana' },
  { value: 'month', label: 'Ovaj mesec' },
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, AppointmentDetailsComponent, ButtonDirective, ColumnChartComponent, ErrorMessageComponent, IconDirective, RsdPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private dashboard = inject(DashboardService);
  private appointmentService = inject(AppointmentService);
  private staffService = inject(StaffService);
  private toast = inject(ToastService);
  private rsd = new RsdPipe();

  readonly periods = PERIODS;
  readonly statuses = STATUS_LABELS;
  readonly todayLabel = longDate(today());
  readonly period = signal<Period>('30');
  readonly todayData = signal<DashboardToday | null>(null);
  readonly stats = signal<DashboardStats | null>(null);
  readonly statsLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly selected = signal<Appointment | null>(null);
  readonly staff = signal<StaffMember[]>([]);

  readonly range = computed(() => {
    const end = today();
    if (this.period() === 'month') return { from: `${end.slice(0, 7)}-01`, to: end };
    return { from: addDays(end, -(Number(this.period()) - 1)), to: end };
  });

  readonly rangeLabel = computed(() => {
    const { from, to } = this.range();
    const a = parseDate(from);
    const b = parseDate(to);
    return `${a.getDate()}.${a.getMonth() + 1}. – ${b.getDate()}.${b.getMonth() + 1}.${b.getFullYear()}.`;
  });

  readonly tiles = computed<Tile[]>(() => {
    const s = this.stats();
    if (!s) return [];
    const { summary: c, previous: p } = s;
    return [
      this.tile('appointments', 'Termini', String(c.appointments), c.appointments, p.appointments, true),
      this.tile('revenue', 'Prihod (završeni)', this.rsd.transform(c.revenue), c.revenue, p.revenue, true),
      this.tile('average', 'Prosečan termin', this.rsd.transform(c.average_ticket), c.average_ticket, p.average_ticket, true),
      this.tile('no-shows', 'Nedolasci', this.percent(c.no_show_rate), c.no_show_rate, p.no_show_rate, false, true),
      this.tile('clients', 'Novi klijenti', String(c.new_clients), c.new_clients, p.new_clients, true),
    ];
  });

  readonly appointmentPoints = computed<ColumnPoint[]>(() => this.points((d) => d.appointments));
  readonly revenuePoints = computed<ColumnPoint[]>(() => this.points((d) => d.revenue));
  readonly topMax = computed(() => Math.max(1, ...(this.stats()?.top_services ?? []).map((s) => s.count)));
  readonly countFormat = (value: number) => (value === 1 ? '1 termin' : `${value.toLocaleString('sr-Latn-RS')} termina`);
  readonly moneyFormat = (value: number) => this.rsd.transform(value);
  readonly moneyTick = (value: number) => (value >= 1000 ? `${Math.round(value / 100) / 10}K` : String(value));

  constructor() {
    this.loadToday();
    this.staffService.list().subscribe((staff) => this.staff.set(staff));
    effect(() => {
      const range = this.range();
      untracked(() => this.loadStats(range.from, range.to));
    });
  }

  time(a: Appointment): string {
    return timeOf(a.starts_at);
  }

  endTime(a: Appointment): string {
    return timeOf(a.ends_at);
  }

  services(a: Appointment): string {
    return a.items.map((i) => i.name).join(' + ');
  }

  when(a: Appointment): string {
    const date = a.starts_at.slice(0, 10);
    return date === today() ? `danas u ${timeOf(a.starts_at)}` : `${weekdayShort(date)} ${parseDate(date).getDate()}.${parseDate(date).getMonth() + 1}. u ${timeOf(a.starts_at)}`;
  }

  percent(value: number): string {
    return `${value.toLocaleString('sr-Latn-RS')}%`;
  }

  hours(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }

  confirm(a: Appointment, event: Event): void {
    event.stopPropagation();
    this.appointmentService.setStatus(a.id, 'confirmed').subscribe({
      next: () => {
        this.toast.success('Termin je potvrđen.');
        this.loadToday();
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Potvrda nije uspela.')),
    });
  }

  onChanged(): void {
    this.selected.set(null);
    this.loadToday();
    const { from, to } = this.range();
    this.loadStats(from, to);
  }

  private tile(key: string, label: string, value: string, current: number, previous: number, upIsGood: boolean, points = false): Tile {
    if (!previous && !current) return { key, label, value, delta: null, tone: 'neutral' };
    if (!previous) return { key, label, value, delta: 'novo u odnosu na prethodni period', tone: upIsGood ? 'good' : 'bad' };
    const diff = points ? current - previous : ((current - previous) / previous) * 100;
    const rounded = Math.round(diff * 10) / 10;
    if (rounded === 0) return { key, label, value, delta: 'isto kao prethodni period', tone: 'neutral' };
    const sign = rounded > 0 ? '+' : '−';
    const unit = points ? ' p.p.' : '%';
    const good = rounded > 0 === upIsGood;
    return { key, label, value, delta: `${sign}${Math.abs(rounded).toLocaleString('sr-Latn-RS')}${unit} prema prethodnom periodu`, tone: good ? 'good' : 'bad' };
  }

  private points(pick: (d: DashboardStats['series'][number]) => number): ColumnPoint[] {
    const series = this.stats()?.series ?? [];
    const long = series.length > 31;
    return series.map((d) => {
      const date = parseDate(d.date);
      return {
        key: d.date,
        label: long ? `${date.getDate()}.${date.getMonth() + 1}.` : String(date.getDate()),
        tooltipLabel: `${weekdayShort(d.date)} ${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}.`,
        value: pick(d),
      };
    });
  }

  private loadToday(): void {
    this.dashboard.today().subscribe({
      next: (data) => this.todayData.set(data),
      error: (err) => this.error.set(apiErrorMessage(err, 'Učitavanje pregleda nije uspelo.')),
    });
    this.appointmentService.refreshPendingCount();
  }

  private loadStats(from: string, to: string): void {
    this.statsLoading.set(true);
    this.dashboard.stats(from, to).subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.statsLoading.set(false);
      },
      error: (err) => {
        this.statsLoading.set(false);
        this.error.set(apiErrorMessage(err, 'Učitavanje statistike nije uspelo.'));
      },
    });
  }
}
