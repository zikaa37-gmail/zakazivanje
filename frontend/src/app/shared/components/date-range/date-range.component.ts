import { Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { merge } from 'rxjs';
import { FormControl } from '@angular/forms';
import { addDays, isoDate, longDate, monthLabel, parseDate, today } from '../../../core/utils/dates';
import { IconDirective } from '../../directives/icon.directive';

interface RangeDay {
  date: string;
  day: number;
  outside: boolean;
  disabled: boolean;
  start: boolean;
  end: boolean;
  inside: boolean;
  today: boolean;
}

@Component({
  selector: 'app-date-range',
  standalone: true,
  imports: [IconDirective],
  host: { class: 'date-range' },
  template: `
    <div class="date-range-head">
      <button type="button" class="btn-icon" aria-label="Prethodni mesec" (click)="step(-1)" data-testid="range-prev"><span appIcon="arrow-left" aria-hidden="true"></span></button>
      <span class="font-semibold">{{ title() }}</span>
      <button type="button" class="btn-icon" aria-label="Sledeći mesec" (click)="step(1)" data-testid="range-next"><span appIcon="arrow-right" aria-hidden="true"></span></button>
    </div>
    <div class="date-range-grid" role="grid">
      @for (name of weekdays; track name) {
        <span class="date-range-weekday">{{ name }}</span>
      }
      @for (d of days(); track d.date) {
        <button
          type="button"
          class="date-range-day"
          [class.is-outside]="d.outside"
          [class.is-start]="d.start"
          [class.is-end]="d.end"
          [class.is-inside]="d.inside"
          [class.is-today]="d.today"
          [disabled]="d.disabled"
          [attr.aria-pressed]="d.start || d.end || d.inside"
          (click)="pick(d.date)"
          [attr.data-testid]="'range-day-' + d.date"
        >
          {{ d.day }}
        </button>
      }
    </div>
    <div class="date-range-summary" data-testid="range-summary">
      @if (picking() === 'end') {
        <span class="muted">Od {{ label(from().value) }} — izaberi poslednji dan</span>
      } @else {
        <span>{{ summary() }}</span>
      }
    </div>
  `,
})
export class DateRangeComponent implements OnInit {
  private destroyRef = inject(DestroyRef);

  readonly from = input.required<FormControl<string>>();
  readonly to = input.required<FormControl<string>>();
  readonly min = input<string | null>(null);

  readonly weekdays = ['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned'];
  readonly month = signal(today());
  readonly picking = signal<'start' | 'end'>('start');
  private readonly start = signal('');
  private readonly end = signal('');

  readonly title = computed(() => monthLabel(this.month()));
  readonly summary = computed(() => {
    const start = this.start();
    const end = this.end();
    if (!start) return 'Izaberi prvi dan';
    if (start === end) return `${this.label(start)} (1 dan)`;
    const count = Math.round((parseDate(end).getTime() - parseDate(start).getTime()) / 86400000) + 1;
    return `${this.label(start)} – ${this.label(end)} (${count} dana)`;
  });
  readonly days = computed<RangeDay[]>(() => {
    const first = parseDate(this.month().slice(0, 7) + '-01');
    const offset = (first.getDay() + 6) % 7;
    const startDate = addDays(isoDate(first), -offset);
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
    const total = Math.ceil((offset + last.getDate()) / 7) * 7;
    const min = this.min();
    const start = this.start();
    const end = this.end();
    const todayIso = today();
    return Array.from({ length: total }, (_, i) => {
      const date = addDays(startDate, i);
      return {
        date,
        day: parseDate(date).getDate(),
        outside: parseDate(date).getMonth() !== first.getMonth(),
        disabled: !!min && date < min,
        start: date === start,
        end: date === end,
        inside: !!start && !!end && date > start && date < end,
        today: date === todayIso,
      };
    });
  });

  ngOnInit(): void {
    this.sync();
    merge(this.from().valueChanges, this.to().valueChanges)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.sync());
  }

  private sync(): void {
    const start = this.from().value;
    this.start.set(start);
    this.end.set(this.to().value);
    if (start && start.slice(0, 7) !== this.month().slice(0, 7) && this.picking() === 'start') this.month.set(start);
  }

  step(direction: 1 | -1): void {
    const date = parseDate(this.month().slice(0, 7) + '-01');
    date.setMonth(date.getMonth() + direction);
    this.month.set(isoDate(date));
  }

  pick(date: string): void {
    if (this.picking() === 'start' || date < this.start()) {
      this.set(date, date);
      this.picking.set('end');
      return;
    }
    this.set(this.start(), date);
    this.picking.set('start');
  }

  label(date: string): string {
    return date ? longDate(date) : '';
  }

  private set(start: string, end: string): void {
    this.start.set(start);
    this.end.set(end);
    this.from().setValue(start);
    this.to().setValue(end);
    this.from().markAsDirty();
  }
}
