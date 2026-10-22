import { Component, input } from '@angular/core';
import { PublicReview } from '../../../core/models/review.model';
import { SrDatePipe } from '../../pipes/sr-date.pipe';
import { StarsComponent } from '../stars/stars.component';

@Component({
  selector: 'app-review-card',
  standalone: true,
  imports: [SrDatePipe, StarsComponent],
  template: `
    <article class="review" [attr.data-testid]="'review-' + review().id">
      <div class="flex items-center justify-between gap-2">
        <app-stars [value]="review().rating" />
        <span class="text-xs muted">{{ review().created_at | srDate }}</span>
      </div>
      @if (review().comment) {
        <p class="review-text">{{ review().comment }}</p>
      }
      <p class="text-xs muted">{{ review().author }} · {{ review().services }}{{ review().staff_name ? ' · ' + review().staff_name : '' }}</p>
      @if (review().reply) {
        <p class="review-reply"><strong>Odgovor salona:</strong> {{ review().reply }}</p>
      }
    </article>
  `,
  styles: `
    .review {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .review-text {
      margin: 0;
      color: var(--color-text);
      white-space: pre-line;
    }

    .review-reply {
      margin: 0.2rem 0 0;
      padding: 0.5rem 0.75rem;
      border-left: 3px solid var(--color-primary);
      border-radius: 0 var(--radius) var(--radius) 0;
      background: var(--color-primary-tint);
      font-size: 0.875rem;
      color: var(--color-text);
    }
  `,
})
export class ReviewCardComponent {
  readonly review = input.required<PublicReview>();
}
