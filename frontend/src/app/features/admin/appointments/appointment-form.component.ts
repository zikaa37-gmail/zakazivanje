import { Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs';
import { Slot } from '../../../core/models/appointment.model';
import { Client } from '../../../core/models/client.model';
import { SalonService } from '../../../core/models/service.model';
import { StaffMember } from '../../../core/models/staff.model';
import { AppointmentService } from '../../../core/services/appointment.service';
import { BookingService } from '../../../core/services/booking.service';
import { ClientService } from '../../../core/services/client.service';
import { ServiceCatalogService } from '../../../core/services/service-catalog.service';
import { StaffService } from '../../../core/services/staff.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { parseDate, timeOf, today, weekdayLong } from '../../../core/utils/dates';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { TimePickerComponent } from '../../../shared/components/time-picker/time-picker.component';
import { ToggleComponent } from '../../../shared/components/toggle/toggle.component';
import { ButtonDirective } from '../../../shared/directives/button.directive';
import { IconDirective } from '../../../shared/directives/icon.directive';
import { InputDirective } from '../../../shared/directives/input.directive';

export interface AppointmentPrefill {
  date?: string;
  time?: string | null;
  staffMemberId?: number | null;
}

@Component({
  selector: 'app-appointment-form',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, ButtonDirective, ErrorMessageComponent, IconDirective, InputDirective, ModalComponent, TimePickerComponent, ToggleComponent],
  templateUrl: './appointment-form.component.html',
})
export class AppointmentFormComponent implements OnInit {
  readonly prefill = input<AppointmentPrefill>({});
  readonly saved = output<void>();
  readonly closed = output<void>();

  private fb = inject(FormBuilder);
  private appointmentService = inject(AppointmentService);
  private booking = inject(BookingService);
  private clientService = inject(ClientService);
  private catalog = inject(ServiceCatalogService);
  private staffService = inject(StaffService);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  readonly staff = signal<StaffMember[]>([]);
  readonly services = signal<SalonService[]>([]);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly clientResults = signal<Client[]>([]);
  readonly selectedClient = signal<Client | null>(null);
  readonly newClient = signal(false);
  readonly selectedServices = signal<number[]>([]);
  readonly suggestions = signal<Slot[]>([]);
  readonly repeat = signal(false);
  readonly repeatEnd = signal<'count' | 'date' | 'never'>('count');
  readonly weekdayLabel = signal('');

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

  ngOnInit(): void {
    const prefill = this.prefill();
    this.form.patchValue({ date: prefill.date ?? today(), staff_member_id: prefill.staffMemberId ?? null });
    this.time.setValue(prefill.time ?? null);

    this.staffService.list().subscribe((staff) => this.staff.set(staff));
    this.catalog.list().subscribe((services) => this.services.set(services.filter((s) => s.active)));

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

  pickClient(client: Client): void {
    this.selectedClient.set(client);
    this.clientResults.set([]);
  }

  toggleNewClient(): void {
    this.newClient.update((v) => !v);
    this.selectedClient.set(null);
  }

  toggleService(id: number): void {
    this.selectedServices.update((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
    const staffId = this.form.controls.staff_member_id.value;
    if (staffId && !this.eligibleStaff().some((m) => m.id === staffId)) this.form.controls.staff_member_id.setValue(null);
    if (!this.form.controls.staff_member_id.value && this.eligibleStaff().length === 1) {
      this.form.controls.staff_member_id.setValue(this.eligibleStaff()[0].id);
    }
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
          const created = res.appointments.length;
          this.toast.success(created > 1 ? `Zakazano termina: ${created}.` : 'Termin je zakazan.');
          if (res.skipped.length) {
            this.toast.warning(`Preskočeno (zauzeto): ${res.skipped.map((s) => this.shortDate(s)).join(', ')}`, { duration: 10000 });
          }
          this.saved.emit();
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
}
