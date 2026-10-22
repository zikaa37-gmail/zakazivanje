import { CdkDrag, CdkDragEnd } from '@angular/cdk/drag-drop';
import { NgStyle } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Appointment, BlockedTime, STATUS_LABELS } from '../../../core/models/appointment.model';
import { StaffMember } from '../../../core/models/staff.model';
import { AppointmentService } from '../../../core/services/appointment.service';
import { BusinessSettingService } from '../../../core/services/business-setting.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { StaffService } from '../../../core/services/staff.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { addDays, isoDate, longDate, monthLabel, parseDate, timeOf, today, weekdayShort } from '../../../core/utils/dates';
import { hoursOn } from '../../../core/utils/schedule';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { MonthCalendarComponent, MonthCalendarItem } from '../../../shared/components/month-calendar/month-calendar.component';
import { TimePickerComponent } from '../../../shared/components/time-picker/time-picker.component';
import { ToggleComponent } from '../../../shared/components/toggle/toggle.component';
import { ButtonDirective } from '../../../shared/directives/button.directive';
import { IconDirective } from '../../../shared/directives/icon.directive';
import { InputDirective } from '../../../shared/directives/input.directive';
import { AppointmentActionsService } from '../appointments/appointment-actions.service';
import { AppointmentDetailsComponent } from '../appointments/appointment-details.component';
import { AppointmentFormComponent, AppointmentPrefill } from '../appointments/appointment-form.component';

type View = 'day' | 'week' | 'month';

interface Column {
  key: string;
  label: string;
  sublabel: string;
  date: string;
  staff: StaffMember | null;
  off: { top: number; height: number }[];
  events: PositionedEvent[];
  blocks: PositionedBlock[];
}

interface PositionedEvent {
  appointment: Appointment;
  top: number;
  height: number;
  left: number;
  width: number;
}

interface PositionedBlock {
  block: BlockedTime;
  top: number;
  height: number;
}

const HOUR_PX = 64;
const SNAP = 15;
const VIEW_KEY = 'zk_calendar_view';

function minutesOf(dateTime: string): number {
  return Number(dateTime.slice(11, 13)) * 60 + Number(dateTime.slice(14, 16));
}

function hhmm(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function mondayOf(date: string): string {
  return addDays(date, -((parseDate(date).getDay() + 6) % 7));
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [ReactiveFormsModule, CdkDrag, NgStyle, AppointmentDetailsComponent, AppointmentFormComponent, ButtonComponent, ButtonDirective, ErrorMessageComponent, IconDirective, InputDirective, ModalComponent, MonthCalendarComponent, TimePickerComponent, ToggleComponent],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
})
export class CalendarComponent {
  private appointmentService = inject(AppointmentService);
  private staffService = inject(StaffService);
  private actionsService = inject(AppointmentActionsService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  private businessSettings = inject(BusinessSettingService);

  readonly hourPx = HOUR_PX;
  readonly todayIso = today();
  readonly statuses = STATUS_LABELS;
  readonly view = signal<View>(this.readView());
  readonly date = signal(today());
  readonly staffFilter = signal<number | null>(null);
  readonly showCancelled = signal(false);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly staff = signal<StaffMember[]>([]);
  readonly appointments = signal<Appointment[]>([]);
  readonly blocks = signal<BlockedTime[]>([]);
  readonly now = signal(new Date());

  readonly formPrefill = signal<AppointmentPrefill | null>(null);
  readonly selected = signal<Appointment | null>(null);
  readonly blockOpen = signal(false);
  readonly blockSaving = signal(false);
  readonly blockError = signal<string | null>(null);
  readonly blockStaff = new FormControl<number | null>(null);
  readonly blockDate = new FormControl(today(), { nonNullable: true });
  readonly blockFrom = new FormControl<string | null>('12:00');
  readonly blockTo = new FormControl<string | null>('13:00');
  readonly blockReason = new FormControl('', { nonNullable: true });
  readonly blockAllDay = signal(false);

  private dragging = false;

  readonly range = computed(() => {
    const d = this.date();
    if (this.view() === 'day') return { from: d, to: d };
    if (this.view() === 'week') {
      const monday = mondayOf(d);
      return { from: monday, to: addDays(monday, 6) };
    }
    const first = d.slice(0, 7) + '-01';
    const start = mondayOf(first);
    return { from: start, to: addDays(start, 41) };
  });

  readonly title = computed(() => {
    const { from, to } = this.range();
    if (this.view() === 'day') return longDate(from);
    if (this.view() === 'month') return monthLabel(this.date());
    const a = parseDate(from);
    const b = parseDate(to);
    return a.getMonth() === b.getMonth()
      ? `${a.getDate()}. – ${b.getDate()}. ${monthLabel(to).toLowerCase()}`
      : `${a.getDate()}. ${monthLabel(from).split(' ')[0].toLowerCase()} – ${b.getDate()}. ${monthLabel(to).toLowerCase()}`;
  });

  readonly visibleStaff = computed(() =>
    this.staff().filter((s) => s.active && (this.staffFilter() === null || s.id === this.staffFilter())),
  );

  readonly visibleAppointments = computed(() =>
    this.appointments().filter(
      (a) =>
        (this.showCancelled() || a.status !== 'cancelled') &&
        (this.staffFilter() === null || a.staff_member_id === this.staffFilter()),
    ),
  );

  readonly hours = computed(() => {
    const days = this.view() === 'day' ? [this.date()] : Array.from({ length: 7 }, (_, i) => addDays(this.range().from, i));
    const opening = this.businessSettings.settings()?.opening_hours;
    const shifts = this.visibleStaff().flatMap((s) => days.flatMap((d) => hoursOn(s, d, opening)));
    let start = shifts.length ? Math.min(...shifts.map((h) => minutesOf(`0000-00-00 ${h.starts_at}`))) : 8 * 60;
    let end = shifts.length ? Math.max(...shifts.map((h) => minutesOf(`0000-00-00 ${h.ends_at}`))) : 20 * 60;
    for (const a of this.visibleAppointments()) {
      start = Math.min(start, minutesOf(a.starts_at));
      end = Math.max(end, minutesOf(a.ends_at));
    }
    const from = Math.max(0, Math.floor(start / 60));
    const to = Math.min(24, Math.ceil(end / 60));
    return { from, to, list: Array.from({ length: to - from }, (_, i) => from + i) };
  });

  readonly gridHeight = computed(() => (this.hours().to - this.hours().from) * HOUR_PX);

  readonly columns = computed<Column[]>(() => {
    const view = this.view();
    if (view === 'month') return [];
    if (view === 'day') {
      const date = this.date();
      return this.visibleStaff().map((s) => this.column(`staff-${s.id}`, `${s.first_name} ${s.last_name}`, s.title ?? '', date, s));
    }
    const single = this.staffFilter() !== null ? this.visibleStaff()[0] ?? null : null;
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(this.range().from, i);
      return this.column(`day-${date}`, `${weekdayShort(date)} ${parseDate(date).getDate()}.`, date === today() ? 'danas' : '', date, single);
    });
  });

  readonly nowLine = computed(() => {
    const now = this.now();
    const date = isoDate(now);
    const minutes = now.getHours() * 60 + now.getMinutes();
    const { from, to } = this.hours();
    if (minutes < from * 60 || minutes > to * 60) return null;
    const top = ((minutes - from * 60) / 60) * HOUR_PX;
    if (this.view() === 'day') return this.date() === date ? { top, column: -1 } : null;
    const index = this.columns().findIndex((c) => c.date === date);
    return index >= 0 ? { top, column: index } : null;
  });

  readonly monthItems = computed<MonthCalendarItem[]>(() =>
    this.visibleAppointments().map((a) => ({
      date: a.starts_at.slice(0, 10),
      label: `${timeOf(a.starts_at)} ${a.client?.first_name ?? ''} ${a.client?.last_name?.[0] ?? ''}.`,
      color: a.staff_member?.color,
      muted: a.status === 'cancelled' || a.status === 'no_show',
    })),
  );

  readonly legend = Object.entries(STATUS_LABELS).map(([key, value]) => ({ key, label: value.label }));

  constructor() {
    this.staffService.list().subscribe((staff) => this.staff.set(staff));

    effect(() => {
      const range = this.range();
      untracked(() => this.load(range.from, range.to));
    });

    const timer = setInterval(() => this.now.set(new Date()), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  setView(view: View): void {
    this.view.set(view);
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {
      return;
    }
  }

  step(direction: 1 | -1): void {
    const d = this.date();
    if (this.view() === 'day') this.date.set(addDays(d, direction));
    else if (this.view() === 'week') this.date.set(addDays(d, direction * 7));
    else {
      const date = parseDate(d.slice(0, 7) + '-01');
      date.setMonth(date.getMonth() + direction);
      this.date.set(isoDate(date));
    }
  }

  goToday(): void {
    this.date.set(today());
  }

  openDay(date: string): void {
    this.date.set(date);
    this.setView('day');
  }

  reload(): void {
    const { from, to } = this.range();
    this.load(from, to);
  }

  eventClass(a: Appointment): string {
    return `event event-${a.status}`;
  }

  eventStyle(e: PositionedEvent): Record<string, string> {
    const color = e.appointment.staff_member?.color || 'var(--color-primary)';
    return {
      top: `${e.top}px`,
      height: `${Math.max(e.height, 22)}px`,
      left: `calc(${e.left * 100}% + 2px)`,
      width: `calc(${e.width * 100}% - 4px)`,
      '--event-color': color,
    };
  }

  eventTitle(a: Appointment): string {
    return `${timeOf(a.starts_at)} ${a.client?.first_name ?? ''} ${a.client?.last_name ?? ''}`.trim();
  }

  eventServices(a: Appointment): string {
    return a.items.map((i) => i.name).join(' + ');
  }

  canDrag(a: Appointment): boolean {
    return this.view() === 'day' && (a.status === 'pending' || a.status === 'confirmed');
  }

  onGridClick(column: Column, event: MouseEvent): void {
    if (this.dragging) return;
    const target = event.currentTarget as HTMLElement;
    const y = event.clientY - target.getBoundingClientRect().top;
    const minutes = this.hours().from * 60 + Math.floor((y / HOUR_PX) * 60 / SNAP) * SNAP;
    this.formPrefill.set({ date: column.date, time: hhmm(minutes), staffMemberId: column.staff?.id ?? this.staffFilter() });
  }

  openNew(): void {
    this.formPrefill.set({ date: this.date(), staffMemberId: this.staffFilter() });
  }

  openEvent(a: Appointment, event: Event): void {
    event.stopPropagation();
    if (this.dragging) return;
    this.selected.set(a);
  }

  onDragStarted(): void {
    this.dragging = true;
  }

  async onDragEnded(e: PositionedEvent, column: Column, event: CdkDragEnd): Promise<void> {
    const { x, y } = event.distance;
    const width = (event.source.element.nativeElement.parentElement as HTMLElement).getBoundingClientRect().width;
    event.source.reset();
    setTimeout(() => (this.dragging = false));

    const minutesDelta = Math.round((y / HOUR_PX) * 60 / SNAP) * SNAP;
    const columnDelta = Math.round(x / width);
    const columns = this.columns();
    const targetIndex = Math.min(columns.length - 1, Math.max(0, columns.indexOf(column) + columnDelta));
    const target = columns[targetIndex];
    if (!minutesDelta && target === column) return;

    const start = minutesOf(e.appointment.starts_at) + minutesDelta;
    if (start < 0 || start >= 24 * 60) return;
    const staffId = target.staff?.id ?? e.appointment.staff_member_id;
    const moved = await this.actionsService.reschedule(e.appointment, staffId, `${target.date} ${hhmm(start)}`);
    if (moved) this.reload();
  }

  onFormSaved(): void {
    this.formPrefill.set(null);
    this.reload();
  }

  onDetailsChanged(): void {
    this.selected.set(null);
    this.reload();
  }

  openBlock(): void {
    this.blockError.set(null);
    this.blockStaff.setValue(this.staffFilter());
    this.blockDate.setValue(this.date());
    this.blockFrom.setValue('12:00');
    this.blockTo.setValue('13:00');
    this.blockReason.setValue('');
    this.blockAllDay.set(false);
    this.blockOpen.set(true);
  }

  saveBlock(): void {
    const from = this.blockAllDay() ? '00:00' : this.blockFrom.value;
    const to = this.blockAllDay() ? '23:59' : this.blockTo.value;
    if (!this.blockDate.value || !from || !to || from >= to) {
      this.blockError.set('Izaberi datum i ispravan period (kraj posle početka).');
      return;
    }

    this.blockSaving.set(true);
    this.appointmentService
      .createBlockedTime({
        staff_member_id: this.blockStaff.value,
        starts_at: `${this.blockDate.value} ${from}`,
        ends_at: `${this.blockDate.value} ${to}`,
        reason: this.blockReason.value.trim() || null,
      })
      .subscribe({
        next: () => {
          this.blockSaving.set(false);
          this.blockOpen.set(false);
          this.toast.success('Vreme je blokirano.');
          this.reload();
        },
        error: (err) => {
          this.blockSaving.set(false);
          this.blockError.set(apiErrorMessage(err, 'Blokiranje nije uspelo.'));
        },
      });
  }

  async removeBlock(block: BlockedTime, event: Event): Promise<void> {
    event.stopPropagation();
    const who = block.staff_member ? `${block.staff_member.first_name} ${block.staff_member.last_name}` : 'ceo salon';
    const ok = await this.confirm.confirm({
      title: 'Uklanjanje blokade',
      message: `Ukloniti blokadu ${timeOf(block.starts_at)} – ${timeOf(block.ends_at)} (${who})${block.reason ? ' — ' + block.reason : ''}?`,
      confirmLabel: 'Ukloni',
    });
    if (!ok) return;
    this.appointmentService.deleteBlockedTime(block.id).subscribe({
      next: () => {
        this.toast.success('Blokada je uklonjena.');
        this.reload();
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Uklanjanje nije uspelo.')),
    });
  }

  blockLabel(block: BlockedTime): string {
    const reason = block.reason || 'Blokirano';
    if (this.view() !== 'week' || this.staffFilter() !== null) return reason;
    return block.staff_member ? `${reason} · ${block.staff_member.first_name}` : `${reason} · ceo salon`;
  }

  private column(key: string, label: string, sublabel: string, date: string, staff: StaffMember | null): Column {
    const startMinute = this.hours().from * 60;
    const endMinute = this.hours().to * 60;
    const px = (minutes: number) => ((minutes - startMinute) / 60) * HOUR_PX;

    const relevantStaff = staff ? [staff] : this.visibleStaff();
    const working = relevantStaff
      .flatMap((s) => hoursOn(s, date, this.businessSettings.settings()?.opening_hours))
      .map((h) => [minutesOf(`0000-00-00 ${h.starts_at}`), minutesOf(`0000-00-00 ${h.ends_at}`)] as const)
      .sort((a, b) => a[0] - b[0]);
    const off: { top: number; height: number }[] = [];
    let cursor = startMinute;
    for (const [s, e] of working) {
      if (s > cursor) off.push({ top: px(cursor), height: px(s) - px(cursor) });
      cursor = Math.max(cursor, e);
    }
    if (cursor < endMinute) off.push({ top: px(cursor), height: px(endMinute) - px(cursor) });

    const events = this.visibleAppointments()
      .filter((a) => a.starts_at.slice(0, 10) === date && (!staff || a.staff_member_id === staff.id))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

    const lanes: number[] = [];
    const placed = events.map((a) => {
      const start = minutesOf(a.starts_at);
      const end = minutesOf(a.ends_at);
      let lane = lanes.findIndex((laneEnd) => laneEnd <= start);
      if (lane === -1) {
        lane = lanes.length;
        lanes.push(end);
      } else {
        lanes[lane] = end;
      }
      return { a, start, end, lane };
    });
    const laneCount = Math.max(1, lanes.length);

    const blocks = this.blocks()
      .filter((b) => b.starts_at.slice(0, 10) <= date && b.ends_at.slice(0, 10) >= date)
      .filter((b) => b.staff_member_id === null || !staff || b.staff_member_id === staff.id || this.view() === 'week')
      .map((b) => {
        const s = b.starts_at.slice(0, 10) < date ? startMinute : Math.max(startMinute, minutesOf(b.starts_at));
        const e = b.ends_at.slice(0, 10) > date ? endMinute : Math.min(endMinute, minutesOf(b.ends_at));
        return { block: b, top: px(s), height: Math.max(px(e) - px(s), 18) };
      })
      .filter((b) => b.height > 0);

    return {
      key,
      label,
      sublabel,
      date,
      staff,
      off,
      blocks,
      events: placed.map(({ a, start, end, lane }) => ({
        appointment: a,
        top: px(start),
        height: px(end) - px(start),
        left: lane / laneCount,
        width: 1 / laneCount,
      })),
    };
  }

  private load(from: string, to: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.appointmentService.list({ from, to, staff_member_id: null, status: null, search: null }).subscribe({
      next: (list) => {
        this.appointments.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'Učitavanje kalendara nije uspelo.'));
        this.loading.set(false);
      },
    });
    this.appointmentService.blockedTimes(from, to).subscribe({ next: (blocks) => this.blocks.set(blocks), error: () => undefined });
  }

  private readView(): View {
    try {
      const stored = localStorage.getItem(VIEW_KEY);
      return stored === 'week' || stored === 'month' ? stored : 'day';
    } catch {
      return 'day';
    }
  }

}
