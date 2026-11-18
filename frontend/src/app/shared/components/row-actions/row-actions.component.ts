import { Component, DestroyRef, ElementRef, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { IconDirective, IconName } from '../../directives/icon.directive';

export interface RowAction {
  id: string;
  label: string;
  icon: IconName;
  disabled?: boolean;
  danger?: boolean;
  separated?: boolean;
}

@Component({
  selector: 'app-row-actions',
  standalone: true,
  imports: [IconDirective],
  templateUrl: './row-actions.component.html',
  styleUrl: './row-actions.component.scss',
  host: {
    class: 'row-actions',
    '(document:click)': 'onDocumentClick($event)',
    '(window:resize)': 'close()',
  },
})
export class RowActionsComponent {
  readonly actions = input.required<RowAction[]>();
  readonly testId = input('', { alias: 'data-testid' });

  readonly selected = output<string>();

  readonly ordered = computed(() => {
    const safe = this.actions().filter((a) => !a.danger);
    const danger = this.actions().filter((a) => a.danger);
    return [...safe, ...danger.map((a, i) => ({ ...a, separated: a.separated || (i === 0 && safe.length > 0) }))];
  });

  readonly open = signal(false);
  readonly menuTop = signal<number | null>(null);
  readonly menuBottom = signal<number | null>(null);
  readonly menuRight = signal(0);

  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private trigger = viewChild.required<ElementRef<HTMLElement>>('trigger');

  constructor() {
    inject(DestroyRef).onDestroy(() => document.removeEventListener('scroll', this.onScroll, true));
  }

  toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }

    const rect = this.trigger().nativeElement.getBoundingClientRect();
    const spacious = document.documentElement.classList.contains('ui-spacious');
    const estimatedHeight = this.actions().length * (spacious ? 56 : 40) + (spacious ? 40 : 12);
    const opensUp = rect.bottom + estimatedHeight > window.innerHeight && rect.top > estimatedHeight;
    this.menuTop.set(opensUp ? null : rect.bottom + 4);
    this.menuBottom.set(opensUp ? window.innerHeight - rect.top + 4 : null);
    this.menuRight.set(window.innerWidth - rect.right);
    this.open.set(true);
    document.addEventListener('scroll', this.onScroll, true);
  }

  close(): void {
    this.open.set(false);
    document.removeEventListener('scroll', this.onScroll, true);
  }

  private readonly onScroll = (event: Event): void => {
    if (!this.el.nativeElement.contains(event.target as Node)) this.close();
  };

  select(action: RowAction): void {
    if (action.disabled) return;

    this.selected.emit(action.id);
    this.close();
  }

  onDocumentClick(event: Event): void {
    if (this.open() && !this.el.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }
}
