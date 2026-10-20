import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { CONFIRMATION_OPTIONS, ConfirmationMode } from '../../../core/models/business-setting.model';
import { SalonService } from '../../../core/models/service.model';
import { StaffMember, StaffMemberPayload, WEEKDAYS } from '../../../core/models/staff.model';
import { BusinessSettingService } from '../../../core/services/business-setting.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ServiceCatalogService } from '../../../core/services/service-catalog.service';
import { StaffService } from '../../../core/services/staff.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
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

  workDays(member: StaffMember): Set<number> {
    return new Set(member.working_hours.map((h) => h.weekday));
  }

  hoursSummary(member: StaffMember): string {
    if (!member.working_hours.length) return 'Nije uneto';
    const first = member.working_hours[0];
    const same = member.working_hours.every((h) => h.starts_at === first.starts_at && h.ends_at === first.ends_at);
    return same ? `${first.starts_at} – ${first.ends_at}` : 'Različito po danima';
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
    const hours = member?.working_hours ?? [1, 2, 3, 4, 5].map((weekday) => ({ weekday, starts_at: '09:00', ends_at: '17:00' }));
    this.shifts.set(hours.map((h) => this.shift(h.weekday, h.starts_at, h.ends_at)));
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
    return this.shifts().filter((s) => s.weekday === weekday);
  }

  toggleDay(weekday: number, on: boolean): void {
    if (on) this.addShift(weekday);
    else this.shifts.update((rows) => rows.filter((r) => r.weekday !== weekday));
  }

  addShift(weekday: number): void {
    const last = this.shiftsFor(weekday).at(-1);
    const row = last ? this.shift(weekday, last.end.value ?? '13:00', '20:00') : this.shift(weekday, '09:00', '17:00');
    this.shifts.update((rows) => [...rows, row]);
  }

  removeShift(row: ShiftRow): void {
    this.shifts.update((rows) => rows.filter((r) => r !== row));
  }

  copyMondayToWeekdays(): void {
    const monday = this.shiftsFor(1);
    if (!monday.length) return;
    const others = [2, 3, 4, 5].flatMap((weekday) => monday.map((m) => this.shift(weekday, m.start.value, m.end.value)));
    this.shifts.update((rows) => [...rows.filter((r) => r.weekday === 1 || r.weekday > 5), ...others]);
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
      working_hours: this.shifts()
        .filter((s) => s.start.value && s.end.value)
        .map((s) => ({ weekday: s.weekday, starts_at: s.start.value!, ends_at: s.end.value! })),
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

  private shift(weekday: number, start: string | null, end: string | null): ShiftRow {
    return { weekday, start: new FormControl(start), end: new FormControl(end) };
  }
}
