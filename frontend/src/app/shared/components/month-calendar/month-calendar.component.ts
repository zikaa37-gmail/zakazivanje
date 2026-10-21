import { Component, computed, input, output } from '@angular/core';
import { addDays, isoDate, parseDate, today } from '../../../core/utils/dates';

export interface MonthCalendarItem {
  date: string;
  label: string;
  color?: string | null;
  muted?: boolean;
}

const WEEKDAYS = ['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned'];

@Component({
  selector: 'app-month-calendar',
  standalone: true,
  templateUrl: './month-calendar.component.html',
  styleUrl: './month-calendar.component.scss',
})
export class MonthCalendarComponent {
  readonly month = input.required<string>();
  readonly items = input<MonthCalendarItem[]>([]);
  readonly maxPerDay = input(3);
  readonly selected = input<string | null>(null);
  readonly testId = input('', { alias: 'data-testid' });

  readonly dayClicked = output<string>();

  readonly weekdays = WEEKDAYS;
  readonly todayIso = today();

  readonly weeks = computed(() => {
    const first = parseDate(this.month().slice(0, 7) + '-01');
    const offset = (first.getDay() + 6) % 7;
    const start = addDays(isoDate(first), -offset);
    const monthKey = this.month().slice(0, 7);
    const byDate = new Map<string, MonthCalendarItem[]>();
    for (const item of this.items()) {
      byDate.set(item.date, [...(byDate.get(item.date) ?? []), item]);
    }

    const weeks = [];
    for (let w = 0; w < 6; w++) {
      const days = [];
      for (let d = 0; d < 7; d++) {
        const date = addDays(start, w * 7 + d);
        const items = byDate.get(date) ?? [];
        days.push({ date, day: parseDate(date).getDate(), inMonth: date.slice(0, 7) === monthKey, items: items.slice(0, this.maxPerDay()), more: Math.max(0, items.length - this.maxPerDay()), count: items.length });
      }
      if (w < 4 || days.some((d) => d.inMonth)) weeks.push(days);
    }
    return weeks;
  });
}
