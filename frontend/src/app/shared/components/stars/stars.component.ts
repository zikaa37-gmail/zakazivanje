import { Component, computed, input } from '@angular/core';
import { ratingLabel } from '../../../core/models/review.model';

@Component({
  selector: 'app-stars',
  standalone: true,
  template: `
    <span class="stars" role="img" [attr.aria-label]="label()" [style.--star-size.px]="size()">
      @for (fill of fills(); track $index) {
        <span class="star" aria-hidden="true">
          <span class="star-fill" [style.width.%]="fill"></span>
        </span>
      }
    </span>
  `,
  styles: `
    .stars {
      display: inline-flex;
      gap: 2px;
      vertical-align: middle;
    }

    .star {
      position: relative;
      display: inline-block;
      width: var(--star-size);
      height: var(--star-size);
      background: var(--color-star-empty);
      mask: url('/icons/star-solid.svg') center / contain no-repeat;
    }

    .star-fill {
      position: absolute;
      inset: 0 auto 0 0;
      background: var(--color-star);
    }
  `,
})
export class StarsComponent {
  readonly value = input.required<number>();
  readonly size = input(16);

  readonly fills = computed(() => [1, 2, 3, 4, 5].map((n) => Math.round(Math.max(0, Math.min(1, this.value() - n + 1)) * 100)));
  readonly label = computed(() => `Ocena ${ratingLabel(this.value())} od 5`);
}
