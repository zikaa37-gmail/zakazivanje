import { Component, input, signal } from '@angular/core';
import { FormControl } from '@angular/forms';

const LABELS = ['', 'Loše', 'Može bolje', 'Dobro', 'Vrlo dobro', 'Odlično'];

@Component({
  selector: 'app-star-input',
  standalone: true,
  template: `
    <div class="star-input" role="radiogroup" aria-label="Ocena" (mouseleave)="hover.set(null)">
      @for (n of options; track n) {
        <button
          type="button"
          role="radio"
          class="star-option"
          [class.is-on]="n <= (hover() ?? control().value ?? 0)"
          [attr.aria-checked]="control().value === n"
          [attr.aria-label]="n + ' od 5 — ' + labels[n]"
          [attr.tabindex]="(control().value ?? 1) === n ? 0 : -1"
          (mouseenter)="hover.set(n)"
          (click)="pick(n)"
          (keydown)="onKey($event, n)"
          [attr.data-testid]="'star-' + n"
        >
          <span class="star-shape" aria-hidden="true"></span>
        </button>
      }
      <span class="star-caption">{{ labels[hover() ?? control().value ?? 0] }}</span>
    </div>
  `,
  styles: `
    .star-input {
      display: flex;
      align-items: center;
      gap: 0.15rem;
    }

    .star-option {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.75rem;
      height: 2.75rem;
      padding: 0;
      border: 0;
      border-radius: var(--radius);
      background: none;
      cursor: pointer;

      &:focus-visible {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: 1px;
      }
    }

    .star-shape {
      width: 2rem;
      height: 2rem;
      background: var(--color-star-empty);
      mask: url('/icons/star-solid.svg') center / contain no-repeat;
      transition: transform 0.1s ease, background 0.1s ease;
    }

    .is-on .star-shape {
      background: var(--color-star);
      transform: scale(1.06);
    }

    .star-caption {
      margin-left: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text-muted);
    }
  `,
})
export class StarInputComponent {
  readonly control = input.required<FormControl<number | null>>();

  readonly options = [1, 2, 3, 4, 5];
  readonly labels = LABELS;
  readonly hover = signal<number | null>(null);

  pick(value: number): void {
    this.control().setValue(value);
    this.control().markAsTouched();
  }

  onKey(event: KeyboardEvent, current: number): void {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = Math.min(5, Math.max(1, current + step));
    this.pick(next);
    ((event.target as HTMLElement).parentElement?.children[next - 1] as HTMLElement | undefined)?.focus();
  }
}
