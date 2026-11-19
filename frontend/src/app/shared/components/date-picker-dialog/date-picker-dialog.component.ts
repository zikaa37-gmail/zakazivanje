import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { AppointmentService } from '../../../core/services/appointment.service';
import { addDays, isoDate, monthLabel, parseDate, today } from '../../../core/utils/dates';
import { ButtonDirective } from '../../directives/button.directive';
import { IconDirective } from '../../directives/icon.directive';
import { ModalComponent } from '../modal/modal.component';
import { MonthCalendarComponent, MonthCalendarItem } from '../month-calendar/month-calendar.component';

@Component({
  selector: 'app-date-picker-dialog',
  imports: [ButtonDirective, IconDirective, ModalComponent, MonthCalendarComponent],
  templateUrl: './date-picker-dialog.component.html',
})
export class DatePickerDialogComponent implements OnInit {
  private appointmentService = inject(AppointmentService);

  readonly date = input<string | null>(null);
  readonly staffMemberId = input<number | null>(null);
  readonly picked = output<string>();
  readonly closed = output<void>();

  readonly todayIso = today();
  readonly month = signal(today());
  readonly title = computed(() => monthLabel(this.month()));
  readonly items = signal<MonthCalendarItem[]>([]);

  ngOnInit(): void {
    this.month.set(this.date() ?? today());
    this.loadCounts();
  }

  step(direction: 1 | -1): void {
    const date = parseDate(this.month().slice(0, 7) + '-01');
    date.setMonth(date.getMonth() + direction);
    this.month.set(isoDate(date));
    this.loadCounts();
  }

  private loadCounts(): void {
    const first = parseDate(this.month().slice(0, 7) + '-01');
    const from = addDays(isoDate(first), -7);
    const to = addDays(isoDate(new Date(first.getFullYear(), first.getMonth() + 1, 0)), 7);
    const month = this.month();
    this.items.set([]);
    this.appointmentService.list({ from, to, staff_member_id: this.staffMemberId(), status: null, search: null }, true).subscribe({
      next: (list) => {
        if (this.month() !== month) return;
        const counts = new Map<string, number>();
        for (const a of list) {
          if (a.status === 'cancelled') continue;
          const day = a.starts_at.slice(0, 10);
          counts.set(day, (counts.get(day) ?? 0) + 1);
        }
        this.items.set([...counts.entries()].map(([date, count]) => ({ date, count, label: `${count} ${count === 1 ? 'termin' : 'termina'}` })));
      },
      error: () => undefined,
    });
  }
}
