import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs';
import { Appointment, AppointmentStatus, STATUS_LABELS, Slot } from '../../../core/models/appointment.model';
import { Client } from '../../../core/models/client.model';
import { SalonService } from '../../../core/models/service.model';
import { StaffMember } from '../../../core/models/staff.model';
import { AppointmentService } from '../../../core/services/appointment.service';
import { BookingService } from '../../../core/services/booking.service';
import { ClientService } from '../../../core/services/client.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ServiceCatalogService } from '../../../core/services/service-catalog.service';
import { StaffService } from '../../../core/services/staff.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { addDays, longDate, parseDate, timeOf, today, weekdayLong } from '../../../core/utils/dates';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { RowAction, RowActionsComponent } from '../../../shared/components/row-actions/row-actions.component';
import { TimePickerComponent } from '../../../shared/components/time-picker/time-picker.component';
import { ToggleComponent } from '../../../shared/components/toggle/toggle.component';
import { ButtonDirective } from '../../../shared/directives/button.directive';
import { IconDirective } from '../../../shared/directives/icon.directive';
import { InputDirective } from '../../../shared/directives/input.directive';
import { RsdPipe } from '../../../shared/pipes/rsd.pipe';

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
  imports: [ReactiveFormsModule, ButtonComponent, ButtonDirective, ErrorMessageComponent, IconDirective, InputDirective, ModalComponent, RowActionsComponent, RsdPipe, TimePickerComponent, ToggleComponent],
  templateUrl: './appointment-list.component.html',
})
export class AppointmentListComponent {
  private fb = inject(FormBuilder);
  private appointmentService = inject(AppointmentService);
  private booking = inject(BookingService);
  private clientService = inject(ClientService);
  private catalog = inject(ServiceCatalogService);
  private staffService = inject(StaffService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
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
  readonly services = signal<SalonService[]>([]);

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
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly clientResults = signal<Client[]>([]);
  readonly selectedClient = signal<Client | null>(null);
  readonly newClient = signal(false);
  readonly selectedServices = signal<number[]>([]);
  readonly suggestions = signal<Slot[]>([]);
  readonly repeat = signal(false);
  readonly repeatEnd = signal<'count' | 'date' | 'never'>('count');

  readonly clientSearch = new FormControl('', { nonNullable: true });
  readonly time = new FormControl<string | null>(null);
  readonly form = this.fb.group({
    staff_member_id: this.fb.control<number | null>(null, Validators.required),
    date: this.fb.nonNullable.control(today(), Validators.required),
    note: this.fb.control<string | null>(null),
    admin_note: this.fb.control<string | null>(null),
    interval_weeks: this.fb.nonNullable.control(1),
    count: this.fb.control<number | null>(8),
    ends_on: this.fb.control<string | null>(null),
  });
  readonly newClientForm = this.fb.nonNullable.group({
    first_name: ['', [Validators.required, Validators.minLength(2)]],
    last_name: ['', Validators.required],
    phone: ['', Validators.required],
  });

  readonly eligibleStaff = computed(() => {
    const ids = this.selectedServices();
    return this.staff().filter((m) => m.active && ids.every((id) => m.services.some((s) => s.id === id)));
  });

  readonly modalDuration = computed(() =>
    this.services()
      .filter((s) => this.selectedServices().includes(s.id))
      .reduce((sum, s) => sum + s.duration_minutes, 0),
  );

  readonly weekdayLabel = signal('');

  constructor() {
    this.staffService.list().subscribe((staff) => this.staff.set(staff));
    this.catalog.list().subscribe((services) => this.services.set(services.filter((s) => s.active)));
    this.appointmentService.refreshPendingCount();

    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.searchTerm.set(value.trim()));

    effect(() => {
      const filters = { ...this.range(), staff_member_id: this.staffFilter(), status: this.statusFilter(), search: this.searchTerm() || null };
      untracked(() => this.load(filters));
    });

    this.clientSearch.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        if (value.trim().length < 2) {
          this.clientResults.set([]);
          return;
        }
        this.clientService.list(value.trim()).subscribe((res) => this.clientResults.set(res.data.slice(0, 6)));
      });

    this.form.valueChanges.pipe(startWith(null), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      const date = this.form.controls.date.value;
      this.weekdayLabel.set(date ? weekdayLong(date).toLowerCase() : '');
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
    const list: RowAction[] = [];
    if (a.status === 'pending') list.push({ id: 'confirmed', label: 'Potvrdi', icon: 'check' });
    if (a.status === 'pending' || a.status === 'confirmed') {
      list.push({ id: 'completed', label: 'Završen', icon: 'check-square' });
      list.push({ id: 'no_show', label: 'Nije došao', icon: 'alert-triangle' });
      list.push({ id: 'cancel', label: 'Otkaži', icon: 'close', danger: true });
      if (a.recurrence?.active) list.push({ id: 'cancel-series', label: 'Otkaži ovaj i sve sledeće', icon: 'close', danger: true });
    } else {
      list.push({ id: 'confirmed', label: 'Vrati na potvrđen', icon: 'rotate-ccw' });
    }
    if (a.client?.phone) list.push({ id: 'call', label: 'Pozovi klijenta', icon: 'phone' });
    return list;
  }

  async onAction(a: Appointment, action: string): Promise<void> {
    if (action === 'call') {
      window.location.href = `tel:${a.client!.phone!.replace(/\s/g, '')}`;
      return;
    }

    if (action === 'cancel' || action === 'cancel-series') {
      const series = action === 'cancel-series';
      const ok = await this.confirm.confirm({
        title: series ? 'Otkazivanje niza' : 'Otkazivanje termina',
        message: series
          ? `Otkazati ovaj i sve sledeće termine za ${a.client?.first_name} ${a.client?.last_name}? Ponavljanje se zaustavlja.`
          : `Otkazati termin ${a.client?.first_name} ${a.client?.last_name} (${timeOf(a.starts_at)})?`,
        confirmLabel: 'Otkaži',
        cancelLabel: 'Ne',
      });
      if (!ok) return;
      this.appointmentService.cancel(a.id, series ? 'series' : 'this').subscribe({
        next: (res) => {
          this.toast.success(res.message);
          this.reload();
        },
        error: (err) => this.toast.error(apiErrorMessage(err, 'Otkazivanje nije uspelo.')),
      });
      return;
    }

    this.appointmentService.setStatus(a.id, action as AppointmentStatus).subscribe({
      next: () => {
        this.toast.success(`Status: ${STATUS_LABELS[action as AppointmentStatus].label}.`);
        this.reload();
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Promena statusa nije uspela.')),
    });
  }

  openForm(): void {
    this.formError.set(null);
    this.selectedClient.set(null);
    this.newClient.set(false);
    this.clientSearch.setValue('', { emitEvent: false });
    this.clientResults.set([]);
    this.selectedServices.set([]);
    this.suggestions.set([]);
    this.repeat.set(false);
    this.repeatEnd.set('count');
    this.time.setValue(null);
    this.newClientForm.reset();
    this.form.reset({ staff_member_id: null, date: this.period() === 'tomorrow' ? addDays(today(), 1) : today(), interval_weeks: 1, count: 8 });
    this.modalOpen.set(true);
  }

  pickClient(client: Client): void {
    this.selectedClient.set(client);
    this.clientResults.set([]);
  }

  toggleService(id: number): void {
    this.selectedServices.update((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
    const staffId = this.form.controls.staff_member_id.value;
    if (staffId && !this.eligibleStaff().some((m) => m.id === staffId)) this.form.controls.staff_member_id.setValue(null);
    if (!staffId && this.eligibleStaff().length === 1) this.form.controls.staff_member_id.setValue(this.eligibleStaff()[0].id);
    this.loadSuggestions();
  }

  loadSuggestions(): void {
    const staffId = this.form.controls.staff_member_id.value;
    const date = this.form.controls.date.value;
    if (!staffId || !date || !this.selectedServices().length) {
      this.suggestions.set([]);
      return;
    }
    this.booking.slots(this.selectedServices(), staffId, date).subscribe((slots) => this.suggestions.set(slots));
  }

  async save(): Promise<void> {
    const value = this.form.getRawValue();
    if (!this.selectedServices().length || !value.staff_member_id || !value.date || !this.time.value) {
      this.formError.set('Izaberi usluge, zaposlenog, datum i vreme.');
      return;
    }

    this.saving.set(true);
    this.formError.set(null);

    let clientId = this.selectedClient()?.id ?? null;
    if (this.newClient()) {
      if (this.newClientForm.invalid) {
        this.newClientForm.markAllAsTouched();
        this.saving.set(false);
        this.formError.set('Unesi ime, prezime i telefon novog klijenta.');
        return;
      }
      try {
        const client = await new Promise<Client>((resolve, reject) =>
          this.clientService
            .create({ ...this.newClientForm.getRawValue(), email: null, whatsapp_number: null, preferred_communication: 'whatsapp', note: null })
            .subscribe({ next: resolve, error: reject }),
        );
        clientId = client.id;
        this.selectedClient.set(client);
        this.newClient.set(false);
      } catch (err) {
        this.saving.set(false);
        this.formError.set(apiErrorMessage(err, 'Klijent nije sačuvan.'));
        return;
      }
    }

    if (!clientId) {
      this.saving.set(false);
      this.formError.set('Izaberi klijenta.');
      return;
    }

    const end = this.repeatEnd();
    this.appointmentService
      .create({
        client_id: clientId,
        service_ids: this.selectedServices(),
        staff_member_id: value.staff_member_id,
        starts_at: `${value.date} ${this.time.value}`,
        note: value.note?.trim() || null,
        admin_note: value.admin_note?.trim() || null,
        recurrence: this.repeat()
          ? { interval_weeks: value.interval_weeks, count: end === 'count' ? value.count : null, ends_on: end === 'date' ? value.ends_on : null }
          : null,
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          this.modalOpen.set(false);
          const created = res.appointments.length;
          this.toast.success(created > 1 ? `Zakazano termina: ${created}.` : 'Termin je zakazan.');
          if (res.skipped.length) {
            this.toast.warning(`Preskočeno (zauzeto): ${res.skipped.map((s) => this.shortDate(s)).join(', ')}`, { duration: 10000 });
          }
          this.reload();
        },
        error: (err) => {
          this.saving.set(false);
          this.formError.set(apiErrorMessage(err, 'Zakazivanje nije uspelo.'));
        },
      });
  }

  private shortDate(dateTime: string): string {
    const d = parseDate(dateTime);
    return `${d.getDate()}.${d.getMonth() + 1}. ${timeOf(dateTime)}`;
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
