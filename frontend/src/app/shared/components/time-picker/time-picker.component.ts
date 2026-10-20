import { Component, DestroyRef, ElementRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { startWith } from 'rxjs';
import { IconDirective } from '../../directives/icon.directive';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

@Component({
  selector: 'app-time-picker',
  standalone: true,
  imports: [IconDirective],
  templateUrl: './time-picker.component.html',
  styleUrl: './time-picker.component.scss',
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class TimePickerComponent implements OnInit {
  readonly control = input.required<FormControl<string | null>>();
  readonly testId = input('', { alias: 'data-testid' });

  readonly hours = HOURS;
  readonly minutes = MINUTES;
  readonly open = signal(false);

  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private destroyRef = inject(DestroyRef);
  private readonly value = signal<string | null>(null);

  readonly selectedHour = computed(() => (this.value() ? Number(this.value()!.split(':')[0]) : null));
  readonly selectedMinute = computed(() => (this.value() ? Number(this.value()!.split(':')[1]) : null));
  readonly displayLabel = computed(() => this.value() ?? '--:--');

  ngOnInit(): void {
    const control = this.control();
    control.valueChanges
      .pipe(startWith(control.value), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.value.set(value ? value.slice(0, 5) : null));
  }

  pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  toggle(): void {
    if (this.control().disabled) return;
    this.open.update((open) => !open);
  }

  selectHour(hour: number): void {
    this.setValue(hour, this.selectedMinute() ?? 0);
  }

  selectMinute(minute: number): void {
    this.setValue(this.selectedHour() ?? 0, minute);
    this.open.set(false);
  }

  onDocumentClick(event: Event): void {
    if (!this.el.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  private setValue(hour: number, minute: number): void {
    const control = this.control();
    control.setValue(`${this.pad(hour)}:${this.pad(minute)}`);
    control.markAsDirty();
    control.markAsTouched();
  }
}
