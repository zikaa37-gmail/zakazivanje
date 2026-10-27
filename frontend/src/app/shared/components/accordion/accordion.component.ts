import { Component, OnInit, input, signal } from '@angular/core';
import { IconDirective } from '../../directives/icon.directive';

@Component({
  selector: 'app-accordion',
  standalone: true,
  imports: [IconDirective],
  templateUrl: './accordion.component.html',
  styleUrl: './accordion.component.scss',
})
export class AccordionComponent implements OnInit {
  readonly title = input.required<string>();
  readonly defaultOpen = input(false);
  readonly variant = input<'card' | 'toolbar'>('card');
  readonly collapsible = input(true);
  readonly hasArrow = input(true);
  readonly stickyHeader = input(false);
  readonly testId = input('', { alias: 'data-testid' });

  readonly isOpen = signal(false);

  ngOnInit(): void {
    this.isOpen.set(this.defaultOpen());
  }

  onHeaderKey(event: Event): void {
    if (event.target !== event.currentTarget) return;

    event.preventDefault();
    this.toggle();
  }

  toggle(): void {
    if (!this.collapsible()) return;

    this.isOpen.update((open) => !open);
  }
}
