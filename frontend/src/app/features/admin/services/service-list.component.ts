import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DURATION_OPTIONS, SalonService, SalonServicePayload } from '../../../core/models/service.model';
import { StaffMember } from '../../../core/models/staff.model';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ServiceCatalogService } from '../../../core/services/service-catalog.service';
import { StaffService } from '../../../core/services/staff.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
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

@Component({
  selector: 'app-service-list',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, ButtonDirective, DataListComponent, DataRowComponent, DurationPipe, ErrorMessageComponent, IconDirective, InputDirective, ModalComponent, RowActionsComponent, RsdPipe, ToggleComponent],
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
    description: this.fb.control<string | null>(null),
    duration_minutes: this.fb.nonNullable.control(30, [Validators.required, Validators.min(5)]),
    price: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    active: this.fb.nonNullable.control(true),
  });

  readonly rowActions: RowAction[] = [
    { id: 'edit', label: 'Izmeni', icon: 'edit' },
    { id: 'copy', label: 'Napravi kopiju', icon: 'copy' },
    { id: 'delete', label: 'Obriši', icon: 'trash', danger: true },
  ];

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
  }

  openForm(service: SalonService | null = null, asCopy = false): void {
    this.editing.set(asCopy ? null : service);
    this.formError.set(null);
    this.form.reset({
      name: service?.name ?? '',
      category: service?.category ?? null,
      description: service?.description ?? null,
      duration_minutes: service?.duration_minutes ?? 30,
      price: service?.price ?? null,
      active: service?.active ?? true,
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
      message: `Obrisati uslugu „${service.name}"? Ako je samo privremeno ne nudiš, isključi je (neaktivna).`,
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
