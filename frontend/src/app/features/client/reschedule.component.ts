import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { Appointment, DayAvailability, Slot } from '../../core/models/appointment.model';
import { PublicService } from '../../core/models/service.model';
import { BookingService } from '../../core/services/booking.service';
import { ToastService } from '../../core/services/toast.service';
import { apiErrorMessage } from '../../core/utils/api-error';
import { addDays, longDate, monthLabel, parseDate, timeOf, today, weekdayShort } from '../../core/utils/dates';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { IconDirective } from '../../shared/directives/icon.directive';

const WINDOW = 14;

@Component({
  selector: 'app-reschedule',
  standalone: true,
  imports: [ButtonComponent, ErrorMessageComponent, IconDirective, ModalComponent],
  templateUrl: './reschedule.component.html',
})
export class RescheduleComponent implements OnInit {
  readonly appointment = input.required<Appointment>();
  readonly moved = output<void>();
  readonly closed = output<void>();

  private booking = inject(BookingService);
  private toast = inject(ToastService);

  readonly services = signal<PublicService[]>([]);
  readonly staffId = signal<number | null>(null);
  readonly windowStart = signal(today());
  readonly days = signal<DayAvailability[]>([]);
  readonly date = signal<string | null>(null);
  readonly slots = signal<Slot[]>([]);
  readonly time = signal<string | null>(null);
  readonly loadingSlots = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly serviceIds = computed(() => this.appointment().items.map((i) => i.service_id).filter((id): id is number => id !== null));
  readonly staffOptions = computed(() => {
    const ids = this.serviceIds();
    const selected = this.services().filter((s) => ids.includes(s.id));
    if (!selected.length) return [];
    return selected[0].staff_members.filter((m) => selected.every((s) => s.staff_members.some((x) => x.id === m.id)));
  });
  readonly current = computed(() => `${longDate(this.appointment().starts_at)} u ${timeOf(this.appointment().starts_at)}`);
  readonly windowLabel = computed(() => monthLabel(this.days()[3]?.date ?? this.windowStart()));
  readonly canGoBack = computed(() => this.windowStart() > today());
  readonly summary = computed(() => (this.date() && this.time() ? `${longDate(this.date()!)} u ${this.time()}` : null));

  ngOnInit(): void {
    this.staffId.set(this.appointment().staff_member_id);
    this.booking.services().subscribe((services) => this.services.set(services));
    this.loadDays();
  }

  weekday(date: string): string {
    return weekdayShort(date);
  }

  dayOfMonth(date: string): number {
    return parseDate(date).getDate();
  }

  chooseStaff(id: number | null): void {
    this.staffId.set(id);
    this.time.set(null);
    this.loadDays();
  }

  shiftWindow(direction: 1 | -1): void {
    const next = addDays(this.windowStart(), direction * WINDOW);
    this.windowStart.set(next < today() ? today() : next);
    this.loadDays();
  }

  chooseDay(day: DayAvailability): void {
    if (!day.available) return;
    this.date.set(day.date);
    this.time.set(null);
    this.loadSlots();
  }

  save(): void {
    const date = this.date();
    const time = this.time();
    if (!date || !time) return;

    this.saving.set(true);
    this.error.set(null);
    this.booking.rescheduleMine(this.appointment().id, this.staffId(), `${date} ${time}`).subscribe({
      next: (moved) => {
        this.saving.set(false);
        this.toast.success(moved.status === 'pending' ? 'Termin je pomeren — salon će potvrditi novo vreme.' : 'Termin je pomeren.');
        this.moved.emit();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(err, 'Promena termina nije uspela.'));
        if (err?.error?.errors?.starts_at) this.loadSlots();
      },
    });
  }

  private loadDays(): void {
    this.booking.days(this.serviceIds(), this.staffId(), this.windowStart(), WINDOW, this.appointment().id).subscribe((days) => {
      this.days.set(days);
      const date = this.date();
      if (!date || !days.some((d) => d.date === date && d.available)) {
        const first = days.find((d) => d.available);
        this.date.set(first?.date ?? null);
      }
      this.loadSlots();
    });
  }

  private loadSlots(): void {
    const date = this.date();
    if (!date) {
      this.slots.set([]);
      return;
    }
    this.loadingSlots.set(true);
    this.booking.slots(this.serviceIds(), this.staffId(), date, this.appointment().id).subscribe({
      next: (slots) => {
        this.slots.set(slots);
        this.loadingSlots.set(false);
        if (this.time() && !slots.some((s) => s.time === this.time())) this.time.set(null);
      },
      error: () => this.loadingSlots.set(false),
    });
  }
}
