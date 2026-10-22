import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { CONFIRMATION_OPTIONS, ConfirmationMode, ShiftTemplate } from '../../../core/models/business-setting.model';
import { SalonService } from '../../../core/models/service.model';
import { StaffMember, StaffMemberPayload, WEEKDAYS } from '../../../core/models/staff.model';
import { BusinessSettingService } from '../../../core/services/business-setting.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ServiceCatalogService } from '../../../core/services/service-catalog.service';
import { StaffService } from '../../../core/services/staff.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { isoDate, today } from '../../../core/utils/dates';
import { shiftName } from '../../../core/utils/schedule';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { RowAction, RowActionsComponent } from '../../../shared/components/row-actions/row-actions.component';
import { TimePickerComponent } from '../../../shared/components/time-picker/time-picker.component';
import { ToggleComponent } from '../../../shared/components/toggle/toggle.component';
import { ButtonDirective } from '../../../shared/directives/button.directive';
import { IconDirective } from '../../../shared/directives/icon.directive';
import { InputDirective } from '../../../shared/directives/input.directive';

interface ShiftRow {
  weekday: number;
  week: number;
  start: FormControl<string | null>;
  end: FormControl<string | null>;
}

const PALETTE = ['#0f766e', '#b45309', '#7c3aed', '#be123c', '#1d4ed8', '#15803d', '#a21caf', '#0e7490'];

@Component({
  selector: 'app-staff-list',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, ButtonDirective, ErrorMessageComponent, IconDirective, InputDirective, ModalComponent, RowActionsComponent, TimePickerComponent, ToggleComponent],
  templateUrl: './staff-list.component.html',
})
export class StaffListComponent {
  private fb = inject(FormBuilder);
  private staffService = inject(StaffService);
  private catalog = inject(ServiceCatalogService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  private business = inject(BusinessSettingService);

  readonly weekdays = WEEKDAYS;
  readonly palette = PALETTE;
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly staff = signal<StaffMember[]>([]);
  readonly services = signal<SalonService[]>([]);

  readonly editing = signal<StaffMember | null>(null);
  readonly modalOpen = signal(false);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly selectedServices = signal<Set<number>>(new Set());
  readonly shifts = signal<ShiftRow[]>([]);
  readonly rotationWeeks = signal(1);
  readonly rotationStart = signal<string>(this.monday(today()));
  readonly activeWeek = signal(0);
  readonly rotationOptions = [
    { value: 1, label: 'Isto svake nedelje' },
    { value: 2, label: 'Smenski, 2 nedelje' },
    { value: 3, label: 'Smenski, 3 nedelje' },
    { value: 4, label: 'Smenski, 4 nedelje' },
  ];
  readonly salonShifts = computed<ShiftTemplate[]>(() => this.business.settings()?.shifts ?? []);
  readonly openingHours = computed(() => this.business.settings()?.opening_hours ?? []);
  readonly weekTabs = computed(() => Array.from({ length: this.rotationWeeks() }, (_, i) => i));
  readonly thisWeekIndex = computed(() => {
    const weeks = this.rotationWeeks();
    if (weeks === 1) return 0;
    const diff = Math.round((Date.parse(this.monday(today())) - Date.parse(this.rotationStart())) / (7 * 86400000));
    return ((diff % weeks) + weeks) % weeks;
  });

  readonly defaultModeLabel = computed(() => {
    const mode = this.business.settings()?.booking_confirmation ?? 'manual';
    return CONFIRMATION_OPTIONS.find((o) => o.value === mode)?.label ?? '';
  });

  readonly confirmationOptions = CONFIRMATION_OPTIONS;

  readonly form = this.fb.group({
    first_name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
    last_name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
    title: this.fb.control<string | null>(null),
    phone: this.fb.control<string | null>(null),
    email: this.fb.control<string | null>(null, Validators.email),
    color: this.fb.nonNullable.control(PALETTE[0]),
    booking_confirmation: this.fb.control<ConfirmationMode | null>(null),
    active: this.fb.nonNullable.control(true),
  });

  readonly rowActions: RowAction[] = [
    { id: 'edit', label: 'Izmeni', icon: 'edit' },
    { id: 'delete', label: 'Obriši', icon: 'trash', danger: true },
  ];

  constructor() {
    this.load();
    this.catalog.list().subscribe((services) => this.services.set(services));
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.staffService.list().subscribe({
      next: (staff) => {
        this.staff.set(staff);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'Učitavanje zaposlenih nije uspelo.'));
        this.loading.set(false);
      },
    });
  }

  currentHours(member: StaffMember) {
    return member.working_hours.filter((h) => (h.week ?? 0) === (member.current_week ?? 0));
  }

  workDays(member: StaffMember): Set<number> {
    return new Set(this.currentHours(member).map((h) => h.weekday));
  }

  hoursSummary(member: StaffMember): string {
    const hours = this.currentHours(member);
    if (!hours.length) return member.rotation_weeks > 1 ? `Smenski (${member.rotation_weeks} ned.) · ove nedelje ne radi` : 'Nije uneto';
    const byDay = [...new Set(hours.map((h) => h.weekday))].map((d) => shiftName(hours.filter((h) => h.weekday === d), this.salonShifts()));
    const label = byDay.every((l) => l === byDay[0]) ? byDay[0] : 'različito po danima';
    return member.rotation_weeks > 1 ? `Smenski (${member.rotation_weeks} ned.) · ove nedelje: ${label}` : label;
  }

  salonHours(weekday: number): string {
    const day = this.openingHours().find((h) => h.weekday === weekday);
    return day?.opens_at && day.closes_at ? `salon ${day.opens_at}–${day.closes_at}` : 'salon ne radi';
  }

  salonOpen(weekday: number): boolean {
    const day = this.openingHours().find((h) => h.weekday === weekday);
    return !this.openingHours().length || !!(day?.opens_at && day.closes_at);
  }

  dayShiftName(weekday: number): string | null {
    const rows = this.shiftsFor(weekday);
    if (rows.length !== 1) return null;
    return this.salonShifts().find((s) => s.starts_at === rows[0].start.value && s.ends_at === rows[0].end.value)?.name ?? null;
  }

  setRotation(weeks: number): void {
    this.rotationWeeks.set(weeks);
    this.shifts.update((rows) => {
      const kept = rows.filter((r) => r.week < weeks);
      const missing = Array.from({ length: weeks }, (_, w) => w).filter((w) => !kept.some((r) => r.week === w) && w > 0);
      const base = kept.filter((r) => r.week === 0);
      return [...kept, ...missing.flatMap((w) => this.swapped(base).map((r) => ({ ...r, week: w })))];
    });
    if (this.activeWeek() >= weeks) this.activeWeek.set(0);
  }

  setRotationStart(value: string): void {
    if (value) this.rotationStart.set(this.monday(value));
  }

  applyShift(weekday: number, shift: ShiftTemplate): void {
    const week = this.activeWeek();
    this.shifts.update((rows) => [...rows.filter((r) => !(r.weekday === weekday && r.week === week)), this.shift(weekday, shift.starts_at, shift.ends_at, week)]);
  }

  setCustom(weekday: number): void {
    if (!this.shiftsFor(weekday).length) this.addShift(weekday);
  }

  fillFromPrevious(): void {
    const week = this.activeWeek();
    if (week === 0) return;
    const previous = this.shifts().filter((r) => r.week === week - 1);
    this.shifts.update((rows) => [...rows.filter((r) => r.week !== week), ...this.swapped(previous).map((r) => ({ ...r, week }))]);
  }

  modeLabel(member: StaffMember): string {
    if (!member.booking_confirmation) return `Kao biznis (${this.defaultModeLabel().toLowerCase()})`;
    return CONFIRMATION_OPTIONS.find((o) => o.value === member.booking_confirmation)?.label ?? '';
  }

  initials(member: StaffMember): string {
    return `${member.first_name[0] ?? ''}${member.last_name[0] ?? ''}`.toUpperCase();
  }

  onAction(member: StaffMember, action: string): void {
    if (action === 'edit') this.openForm(member);
    if (action === 'delete') this.remove(member);
  }

  openForm(member: StaffMember | null = null): void {
    this.editing.set(member);
    this.formError.set(null);
    this.form.reset({
      first_name: member?.first_name ?? '',
      last_name: member?.last_name ?? '',
      title: member?.title ?? null,
      phone: member?.phone ?? null,
      email: member?.email ?? null,
      color: member?.color ?? PALETTE[this.staff().length % PALETTE.length],
      booking_confirmation: member?.booking_confirmation ?? null,
      active: member?.active ?? true,
    });
    this.selectedServices.set(new Set(member?.services.map((s) => s.id) ?? []));
    const first = this.salonShifts()[0];
    const hours = member?.working_hours ?? [1, 2, 3, 4, 5].map((weekday) => ({ weekday, week: 0, starts_at: first?.starts_at ?? '09:00', ends_at: first?.ends_at ?? '17:00' }));
    this.rotationWeeks.set(member?.rotation_weeks ?? 1);
    this.rotationStart.set(member?.rotation_starts_on ?? this.monday(today()));
    this.activeWeek.set(member?.current_week ?? 0);
    this.shifts.set(hours.map((h) => this.shift(h.weekday, h.starts_at, h.ends_at, h.week ?? 0)));
    this.modalOpen.set(true);
  }

  closeForm(): void {
    this.modalOpen.set(false);
  }

  toggleService(id: number): void {
    this.selectedServices.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  shiftsFor(weekday: number): ShiftRow[] {
    const week = this.activeWeek();
    return this.shifts().filter((s) => s.weekday === weekday && s.week === week);
  }

  toggleDay(weekday: number, on: boolean): void {
    const week = this.activeWeek();
    if (on) this.addShift(weekday);
    else this.shifts.update((rows) => rows.filter((r) => !(r.weekday === weekday && r.week === week)));
  }

  addShift(weekday: number): void {
    const week = this.activeWeek();
    const last = this.shiftsFor(weekday).at(-1);
    const fallback = this.salonShifts()[0];
    const row = last ? this.shift(weekday, last.end.value ?? '13:00', '20:00', week) : this.shift(weekday, fallback?.starts_at ?? '09:00', fallback?.ends_at ?? '17:00', week);
    this.shifts.update((rows) => [...rows, row]);
  }

  removeShift(row: ShiftRow): void {
    this.shifts.update((rows) => rows.filter((r) => r !== row));
  }

  copyMondayToWeekdays(): void {
    const monday = this.shiftsFor(1);
    if (!monday.length) return;
    const week = this.activeWeek();
    const others = [2, 3, 4, 5].filter((d) => this.salonOpen(d)).flatMap((weekday) => monday.map((m) => this.shift(weekday, m.start.value, m.end.value, week)));
    this.shifts.update((rows) => [...rows.filter((r) => r.week !== week || r.weekday === 1 || r.weekday > 5), ...others]);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Popuni ime i prezime.');
      return;
    }

    const value = this.form.getRawValue();
    const payload: StaffMemberPayload = {
      ...value,
      title: value.title || null,
      phone: value.phone || null,
      email: value.email || null,
      service_ids: [...this.selectedServices()],
      rotation_weeks: this.rotationWeeks(),
      rotation_starts_on: this.rotationWeeks() > 1 ? this.rotationStart() : null,
      working_hours: this.shifts()
        .filter((s) => s.start.value && s.end.value && s.week < this.rotationWeeks())
        .map((s) => ({ weekday: s.weekday, week: s.week, starts_at: s.start.value!, ends_at: s.end.value! })),
    };

    const member = this.editing();
    this.saving.set(true);
    this.formError.set(null);
    (member ? this.staffService.update(member.id, payload) : this.staffService.create(payload)).subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success(member ? 'Zaposleni je sačuvan.' : 'Zaposleni je dodat.');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(apiErrorMessage(err, 'Čuvanje nije uspelo.'));
      },
    });
  }

  private async remove(member: StaffMember): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Brisanje zaposlenog',
      message: `Obrisati ${member.first_name} ${member.last_name}? Ako samo više ne radi, bolje ga označi kao neaktivnog.`,
      confirmLabel: 'Obriši',
    });
    if (!ok) return;

    this.staffService.delete(member.id).subscribe({
      next: () => {
        this.toast.success('Zaposleni je obrisan.');
        this.load();
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Brisanje nije uspelo.')),
    });
  }

  private shift(weekday: number, start: string | null, end: string | null, week = this.activeWeek()): ShiftRow {
    return { weekday, week, start: new FormControl(start), end: new FormControl(end) };
  }

  private swapped(rows: ShiftRow[]): ShiftRow[] {
    const [a, b] = this.salonShifts();
    return rows.map((r) => {
      const isA = a && r.start.value === a.starts_at && r.end.value === a.ends_at;
      const isB = b && r.start.value === b.starts_at && r.end.value === b.ends_at;
      const target = isA ? b : isB ? a : null;
      return this.shift(r.weekday, target?.starts_at ?? r.start.value, target?.ends_at ?? r.end.value, r.week);
    });
  }

  private monday(date: string): string {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return isoDate(d);
  }
}
