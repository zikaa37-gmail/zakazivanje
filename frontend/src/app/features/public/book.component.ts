import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Appointment, DayAvailability, Quote, Slot } from '../../core/models/appointment.model';
import { PublicService } from '../../core/models/service.model';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import { BusinessSettingService } from '../../core/services/business-setting.service';
import { apiErrorMessage } from '../../core/utils/api-error';
import { addDays, longDate, monthLabel, parseDate, today, weekdayShort } from '../../core/utils/dates';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { ButtonDirective } from '../../shared/directives/button.directive';
import { IconDirective } from '../../shared/directives/icon.directive';
import { InputDirective } from '../../shared/directives/input.directive';
import { DurationPipe } from '../../shared/pipes/duration.pipe';
import { RsdPipe } from '../../shared/pipes/rsd.pipe';
import { BookingDraftService } from './booking-draft.service';

interface StaffOption {
  id: number | null;
  name: string;
  title: string;
}

const STEPS = ['Usluga', 'Zaposleni', 'Termin', 'Potvrda'];
const WINDOW = 14;

@Component({
  selector: 'app-book',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, ButtonDirective, DurationPipe, ErrorMessageComponent, IconDirective, InputDirective, RsdPipe],
  templateUrl: './book.component.html',
})
export class BookComponent {
  private fb = inject(FormBuilder);
  private booking = inject(BookingService);
  private draftService = inject(BookingDraftService);
  private router = inject(Router);
  protected auth = inject(AuthService);
  protected business = inject(BusinessSettingService);

  readonly steps = STEPS;
  readonly draft = this.draftService.draft;
  readonly services = signal<PublicService[]>([]);
  readonly servicesLoading = signal(true);
  readonly windowStart = signal(today());
  readonly days = signal<DayAvailability[]>([]);
  readonly daysLoading = signal(false);
  readonly slots = signal<Slot[]>([]);
  readonly slotsLoading = signal(false);
  readonly quote = signal<Quote | null>(null);
  readonly asGuest = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly booked = signal<Appointment | null>(null);

  readonly guestForm = this.fb.nonNullable.group({
    first_name: ['', [Validators.required, Validators.minLength(2)]],
    last_name: ['', Validators.required],
    phone: ['', Validators.required],
    email: ['', Validators.email],
  });

  readonly selectedServices = computed(() => this.services().filter((s) => this.draft().serviceIds.includes(s.id)));
  readonly totalDuration = computed(() => this.selectedServices().reduce((sum, s) => sum + s.duration_minutes, 0));
  readonly regularPrice = computed(() => this.selectedServices().reduce((sum, s) => sum + s.price, 0));

  readonly staffOptions = computed<StaffOption[]>(() => {
    const selected = this.selectedServices();
    if (!selected.length) return [];
    const common = selected[0].staff_members.filter((m) => selected.every((s) => s.staff_members.some((x) => x.id === m.id)));
    return [
      { id: null, name: 'Bilo ko', title: 'Prvi slobodan termin' },
      ...common.map((m) => ({ id: m.id, name: `${m.first_name} ${m.last_name}`, title: m.title ?? '' })),
    ];
  });

  readonly staffLabel = computed(() => this.staffOptions().find((o) => o.id === this.draft().staffMemberId)?.name ?? 'Bilo ko');

  readonly slotGroups = computed(() => {
    const groups = [
      { label: 'Pre podne', items: [] as Slot[] },
      { label: 'Popodne', items: [] as Slot[] },
      { label: 'Uveče', items: [] as Slot[] },
    ];
    for (const slot of this.slots()) {
      const hour = Number(slot.time.slice(0, 2));
      groups[hour < 12 ? 0 : hour < 17 ? 1 : 2].items.push(slot);
    }
    return groups.filter((g) => g.items.length);
  });

  readonly noneAvailable = computed(() => this.days().length > 0 && !this.days().some((d) => d.available));
  readonly canGoBack = computed(() => this.windowStart() > today());
  readonly windowLabel = computed(() => monthLabel(this.days()[3]?.date ?? this.windowStart()));
  readonly dateLabel = computed(() => (this.draft().date ? longDate(this.draft().date!) : ''));

  readonly summary = computed(() => {
    const d = this.draft();
    const parts = [this.selectedServices().map((s) => s.name).join(' + ')];
    if (d.step >= 2) parts.push(this.staffLabel());
    if (d.date && d.time && d.step >= 3) parts.push(`${weekdayShort(d.date)} ${parseDate(d.date).getDate()}.${parseDate(d.date).getMonth() + 1}. u ${d.time}`);
    return parts.filter(Boolean).join(' · ');
  });

  constructor() {
    this.booking.services().subscribe({
      next: (services) => {
        this.services.set(services);
        this.servicesLoading.set(false);
        const valid = this.draft().serviceIds.filter((id) => services.some((s) => s.id === id));
        if (valid.length !== this.draft().serviceIds.length) this.draftService.patch({ serviceIds: valid, step: 0 });
      },
      error: () => this.servicesLoading.set(false),
    });

    effect(() => {
      const key = this.daysKey();
      if (!key) return;
      untracked(() => this.loadDays(this.draft().serviceIds, this.draft().staffMemberId, this.windowStart()));
    });

    effect(() => {
      const key = this.slotsKey();
      if (!key) return;
      untracked(() => this.loadSlots(this.draft().serviceIds, this.draft().staffMemberId, this.draft().date!));
    });

    effect(() => {
      const key = this.quoteKey();
      if (!key) return;
      untracked(() =>
        this.booking.quote(this.draft().serviceIds, this.draft().date).subscribe({
          next: (q) => this.quote.set(q),
          error: () => this.quote.set(null),
        }),
      );
    });
  }

  private readonly daysKey = computed(() => {
    const d = this.draft();
    return d.step === 2 && d.serviceIds.length ? `${d.serviceIds.join(',')}|${d.staffMemberId}|${this.windowStart()}` : null;
  });

  private readonly slotsKey = computed(() => {
    const d = this.draft();
    return d.step === 2 && d.date ? `${d.serviceIds.join(',')}|${d.staffMemberId}|${d.date}` : null;
  });

  private readonly quoteKey = computed(() => {
    const d = this.draft();
    return d.step === 3 ? `${d.serviceIds.join(',')}|${d.date}|${this.auth.isAuthenticated()}` : null;
  });

  weekday(date: string): string {
    return weekdayShort(date);
  }

  dayOfMonth(date: string): number {
    return parseDate(date).getDate();
  }

  toggleService(id: number): void {
    const ids = this.draft().serviceIds;
    this.draftService.patch({
      serviceIds: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
      staffMemberId: null,
      staffChosen: false,
      date: null,
      time: null,
    });
  }

  chooseStaff(id: number | null): void {
    this.draftService.patch({ staffMemberId: id, staffChosen: true, date: null, time: null });
  }

  chooseDay(day: DayAvailability): void {
    if (!day.available) return;
    this.draftService.patch({ date: day.date, time: null });
  }

  chooseTime(time: string): void {
    this.draftService.patch({ time });
  }

  shiftWindow(direction: 1 | -1): void {
    const next = addDays(this.windowStart(), direction * WINDOW);
    this.windowStart.set(next < today() ? today() : next);
  }

  goTo(step: number): void {
    this.error.set(null);
    this.draftService.patch({ step });
    window.scrollTo({ top: 0 });
  }

  next(): void {
    const d = this.draft();
    if (d.step === 0 && d.serviceIds.length) this.goTo(this.staffOptions().length === 2 ? 2 : 1);
    else if (d.step === 1 && d.staffChosen) this.goTo(2);
    else if (d.step === 2 && d.date && d.time) this.goTo(3);
  }

  back(): void {
    const d = this.draft();
    if (d.step === 2 && this.staffOptions().length === 2) this.goTo(0);
    else if (d.step > 0) this.goTo(d.step - 1);
    else this.router.navigateByUrl('/');
  }

  stepDisabled(): boolean {
    const d = this.draft();
    return (d.step === 0 && !d.serviceIds.length) || (d.step === 1 && !d.staffChosen) || (d.step === 2 && (!d.date || !d.time));
  }

  loginToBook(): void {
    this.router.navigate(['/login'], { queryParams: { returnUrl: '/book' } });
  }

  submit(): void {
    const d = this.draft();
    if (!d.date || !d.time) return;

    const guest = !this.auth.isAuthenticated();
    if (guest && this.guestForm.invalid) {
      this.guestForm.markAllAsTouched();
      this.error.set('Unesi ime, prezime i telefon.');
      return;
    }

    const g = this.guestForm.getRawValue();
    this.saving.set(true);
    this.error.set(null);
    this.booking
      .book({
        service_ids: d.serviceIds,
        staff_member_id: d.staffMemberId,
        starts_at: `${d.date} ${d.time}`,
        note: d.note.trim() || null,
        ...(guest ? { guest: { first_name: g.first_name.trim(), last_name: g.last_name.trim(), phone: g.phone.trim(), email: g.email.trim() || null } } : {}),
      })
      .subscribe({
        next: (appointment) => {
          this.saving.set(false);
          this.booked.set(appointment);
          this.draftService.reset();
          window.scrollTo({ top: 0 });
        },
        error: (err) => {
          this.saving.set(false);
          const message = apiErrorMessage(err, 'Zakazivanje nije uspelo.');
          this.error.set(message);
          if (err?.error?.errors?.starts_at) {
            this.draftService.patch({ time: null });
          }
        },
      });
  }

  bookedDate(appointment: Appointment): string {
    return `${longDate(appointment.starts_at)} u ${appointment.starts_at.slice(11, 16)}`;
  }

  bookAnother(): void {
    this.booked.set(null);
    this.draftService.reset();
  }

  setNote(event: Event): void {
    this.draftService.patch({ note: (event.target as HTMLTextAreaElement).value });
  }

  private loadDays(serviceIds: number[], staffId: number | null, from: string): void {
    this.daysLoading.set(true);
    this.booking.days(serviceIds, staffId, from, WINDOW).subscribe({
      next: (days) => {
        this.days.set(days);
        this.daysLoading.set(false);
        const d = this.draft();
        if (!d.date || !days.some((x) => x.date === d.date && x.available)) {
          const first = days.find((x) => x.available);
          if (first && (!d.date || d.date < from || d.date >= addDays(from, WINDOW))) this.draftService.patch({ date: first.date, time: null });
        }
      },
      error: () => this.daysLoading.set(false),
    });
  }

  private loadSlots(serviceIds: number[], staffId: number | null, date: string): void {
    this.slotsLoading.set(true);
    this.booking.slots(serviceIds, staffId, date).subscribe({
      next: (slots) => {
        this.slots.set(slots);
        this.slotsLoading.set(false);
        const time = this.draft().time;
        if (time && !slots.some((s) => s.time === time)) this.draftService.patch({ time: null });
      },
      error: () => this.slotsLoading.set(false),
    });
  }
}
