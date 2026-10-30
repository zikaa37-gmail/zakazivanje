import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { CONFIRMATION_OPTIONS, ConfirmationMode } from '../../../core/models/business-setting.model';
import { AUDIENCE_OPTIONS, DURATION_OPTIONS, SalonService, SalonServicePayload, ServiceAudience, audienceLabel, isPaused } from '../../../core/models/service.model';
import { StaffMember } from '../../../core/models/staff.model';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ServiceCatalogService } from '../../../core/services/service-catalog.service';
import { StaffService } from '../../../core/services/staff.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { addDays, today } from '../../../core/utils/dates';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { DataListComponent } from '../../../shared/components/data-list/data-list.component';
import { DataRowComponent } from '../../../shared/components/data-row/data-row.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { RowAction, RowActionsComponent } from '../../../shared/components/row-actions/row-actions.component';
import { ToggleComponent } from '../../../shared/components/toggle/toggle.component';
import { ButtonDirective } from '../../../shared/directives/button.directive';
import { IconDirective } from '../../../shared/directives/icon.directive';
import { InputDirective } from '../../../shared/directives/input.directive';
import { DurationPipe } from '../../../shared/pipes/duration.pipe';
import { RsdPipe } from '../../../shared/pipes/rsd.pipe';
import { SrDatePipe } from '../../../shared/pipes/sr-date.pipe';

@Component({
  selector: 'app-service-list',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, ButtonDirective, DataListComponent, DataRowComponent, DurationPipe, ErrorMessageComponent, IconDirective, InputDirective, ModalComponent, RowActionsComponent, RsdPipe, SrDatePipe, ToggleComponent],
  templateUrl: './service-list.component.html',
})
export class ServiceListComponent {
  private fb = inject(FormBuilder);
  private catalog = inject(ServiceCatalogService);
  private staffService = inject(StaffService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);

  readonly columns = 'minmax(0, 2.2fr) 6rem 7rem minmax(0, 1.6fr) 6.5rem 2.5rem';
  readonly durations = DURATION_OPTIONS;
  readonly audiences = AUDIENCE_OPTIONS;
  readonly audienceLabel = audienceLabel;
  readonly confirmationOptions: { value: ConfirmationMode | null; label: string }[] = [{ value: null, label: 'Kao zaposleni' }, ...CONFIRMATION_OPTIONS];
  readonly confirmationLabel = (mode: ConfirmationMode | null) => (mode ? `Potvrda: ${CONFIRMATION_OPTIONS.find((o) => o.value === mode)?.label.toLowerCase()}` : '');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly services = signal<SalonService[]>([]);
  readonly staff = signal<StaffMember[]>([]);

  readonly groups = computed(() => {
    const map = new Map<string, SalonService[]>();
    for (const service of this.services()) {
      const key = service.category || 'Ostalo';
      map.set(key, [...(map.get(key) ?? []), service]);
    }
    return [...map.entries()].map(([category, items]) => ({ category, items }));
  });

  readonly categories = computed(() => [...new Set(this.services().map((s) => s.category).filter(Boolean))] as string[]);

  readonly editing = signal<SalonService | null>(null);
  readonly modalOpen = signal(false);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly selectedStaff = signal<Set<number>>(new Set());

  readonly form = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
    category: this.fb.control<string | null>(null),
    audience: this.fb.nonNullable.control<ServiceAudience>('all'),
    booking_confirmation: this.fb.control<ConfirmationMode | null>(null),
    description: this.fb.control<string | null>(null),
    duration_minutes: this.fb.nonNullable.control(30, [Validators.required, Validators.min(5)]),
    price: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    active: this.fb.nonNullable.control(true),
    paused_until: this.fb.control<string | null>(null),
  });

  readonly today = today();
  readonly pausing = signal<SalonService | null>(null);
  readonly pauseUntil = new FormControl<string>(addDays(today(), 7), { nonNullable: true });

  isPaused(service: SalonService): boolean {
    return service.active && isPaused(service, this.today);
  }

  actionsFor(service: SalonService): RowAction[] {
    return [
      { id: 'edit', label: 'Izmeni', icon: 'edit' },
      { id: 'copy', label: 'Napravi kopiju', icon: 'copy' },
      ...(!service.active
        ? [{ id: 'enable', label: 'Omogući', icon: 'unlock' as const }]
        : [
            this.isPaused(service) ? { id: 'unpause', label: 'Ukini pauzu', icon: 'rotate-ccw' as const } : { id: 'pause', label: 'Privremeno pauziraj…', icon: 'clock' as const },
            { id: 'disable', label: 'Onemogući (trajno)', icon: 'lock' as const },
          ]),
      { id: 'delete', label: 'Obriši', icon: 'trash', danger: true },
    ];
  }

  constructor() {
    this.load();
    this.staffService.list().subscribe((staff) => this.staff.set(staff));
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.catalog.list().subscribe({
      next: (services) => {
        this.services.set(services);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'Učitavanje usluga nije uspelo.'));
        this.loading.set(false);
      },
    });
  }

  staffNames(service: SalonService): string {
    return service.staff_members.map((s) => s.first_name).join(', ') || '—';
  }

  onAction(service: SalonService, action: string): void {
    if (action === 'edit') this.openForm(service);
    if (action === 'copy') this.openForm({ ...service, name: `${service.name} (kopija)` }, true);
    if (action === 'delete') this.remove(service);
    if (action === 'enable') this.patch(service, { active: true, paused_until: null }, 'Usluga je ponovo dostupna.');
    if (action === 'disable') this.patch(service, { active: false, paused_until: null }, 'Usluga je onemogućena — klijenti je više ne vide.');
    if (action === 'unpause') this.patch(service, { paused_until: null }, 'Pauza je ukinuta.');
    if (action === 'pause') {
      this.pauseUntil.setValue(addDays(this.today, 7));
      this.pausing.set(service);
    }
  }

  confirmPause(): void {
    const service = this.pausing();
    const until = this.pauseUntil.value;
    if (!service || !until || until < this.today) return;
    this.pausing.set(null);
    this.patch(service, { paused_until: until }, 'Usluga je pauzirana.');
  }

  private patch(service: SalonService, changes: Partial<SalonServicePayload>, message: string): void {
    const payload: SalonServicePayload = {
      name: service.name,
      description: service.description,
      category: service.category,
      audience: service.audience,
      booking_confirmation: service.booking_confirmation,
      duration_minutes: service.duration_minutes,
      price: service.price,
      active: service.active,
      paused_until: service.paused_until,
      staff_member_ids: service.staff_members.map((s) => s.id),
      ...changes,
    };
    this.catalog.update(service.id, payload).subscribe({
      next: () => {
        this.toast.success(message);
        this.load();
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Čuvanje nije uspelo.')),
    });
  }

  openForm(service: SalonService | null = null, asCopy = false): void {
    this.editing.set(asCopy ? null : service);
    this.formError.set(null);
    this.form.reset({
      name: service?.name ?? '',
      category: service?.category ?? null,
      audience: service?.audience ?? 'all',
      booking_confirmation: service?.booking_confirmation ?? null,
      description: service?.description ?? null,
      duration_minutes: service?.duration_minutes ?? 30,
      price: service?.price ?? null,
      active: service?.active ?? true,
      paused_until: service?.paused_until ?? null,
    });
    this.selectedStaff.set(new Set(service?.staff_members.map((s) => s.id) ?? this.staff().map((s) => s.id)));
    this.modalOpen.set(true);
  }

  toggleStaff(id: number): void {
    this.selectedStaff.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Unesi naziv, trajanje i cenu.');
      return;
    }

    const value = this.form.getRawValue();
    const payload: SalonServicePayload = {
      ...value,
      price: Number(value.price),
      duration_minutes: Number(value.duration_minutes),
      category: value.category?.trim() || null,
      description: value.description?.trim() || null,
      paused_until: value.paused_until || null,
      staff_member_ids: [...this.selectedStaff()],
    };

    const service = this.editing();
    this.saving.set(true);
    this.formError.set(null);
    (service ? this.catalog.update(service.id, payload) : this.catalog.create(payload)).subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success('Usluga je sačuvana.');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(apiErrorMessage(err, 'Čuvanje nije uspelo.'));
      },
    });
  }

  private async remove(service: SalonService): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Brisanje usluge',
      message: `Obrisati uslugu „${service.name}"? Brisanje je moguće samo ako usluga nikad nije zakazana — inače je onemogući ili pauziraj.`,
      confirmLabel: 'Obriši',
    });
    if (!ok) return;

    this.catalog.delete(service.id).subscribe({
      next: () => {
        this.toast.success('Usluga je obrisana.');
        this.load();
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Brisanje nije uspelo.')),
    });
  }
}
