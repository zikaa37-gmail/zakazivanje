import { Component, ElementRef, computed, inject, input, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { switchMap } from 'rxjs';
import { IconDirective } from '../../directives/icon.directive';

export interface SelectSearchOption<T> {
  value: T;
  label: string;
  hint?: string;
}

@Component({
  selector: 'app-select-search',
  standalone: true,
  imports: [IconDirective],
  templateUrl: './select-search.component.html',
  styleUrl: './select-search.component.scss',
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class SelectSearchComponent<T extends string | number> {
  readonly control = input.required<FormControl<T | null>>();
  readonly options = input.required<SelectSearchOption<T>[]>();
  readonly placeholder = input('Pretraži...');
  readonly inputId = input<string | null>(null);
  readonly remote = input(false);
  readonly testId = input('', { alias: 'data-testid' });

  readonly searched = output<string>();

  readonly open = signal(false);
  readonly query = signal('');

  private readonly value = toSignal(toObservable(this.control).pipe(switchMap((c) => c.valueChanges)), { initialValue: null });
  private readonly picked = signal<SelectSearchOption<T> | null>(null);

  readonly filteredOptions = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q || this.remote()) return this.options();
    return this.options().filter((o) => `${o.label} ${o.hint ?? ''}`.toLowerCase().includes(q));
  });

  readonly selectedLabel = computed(() => {
    const current = this.value() ?? this.control().value;
    if (current === null) return '';
    const option = this.options().find((o) => o.value === current) ?? (this.picked()?.value === current ? this.picked() : null);
    return option?.label ?? '';
  });

  private el = inject<ElementRef<HTMLElement>>(ElementRef);

  openList(): void {
    if (this.control().disabled) return;
    this.query.set('');
    this.open.set(true);
    this.searched.emit('');
  }

  onQueryInput(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.query.set(text);
    this.open.set(true);
    this.searched.emit(text.trim());
  }

  selectOption(option: SelectSearchOption<T>): void {
    this.picked.set(option);
    this.control().setValue(option.value);
    this.control().markAsTouched();
    this.open.set(false);
    this.query.set('');
  }

  onDocumentClick(event: Event): void {
    if (!this.el.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
      this.query.set('');
    }
  }
}
