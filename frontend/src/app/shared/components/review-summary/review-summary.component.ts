import { Component, computed, input } from '@angular/core';
import { ReviewSummary, ratingLabel } from '../../../core/models/review.model';
import { StarsComponent } from '../stars/stars.component';

@Component({
  selector: 'app-review-summary',
  standalone: true,
  imports: [StarsComponent],
  template: `
    <div class="summary" data-testid="review-summary">
      <div class="summary-score">
        <span class="summary-average">{{ average() }}</span>
        <app-stars [value]="summary().average ?? 0" [size]="18" />
        <span class="text-sm muted">{{ countLabel() }}</span>
      </div>
      @if (showDistribution()) {
        <div class="summary-bars">
          @for (row of summary().distribution; track row.rating) {
            <div class="bar-row" [attr.aria-label]="row.rating + ' zvezdica: ' + row.count">
              <span class="bar-label">{{ row.rating }}</span>
              <span class="bar-track"><span class="bar-fill" [style.width.%]="percent(row.count)"></span></span>
              <span class="bar-count">{{ row.count }}</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .summary {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1rem 2rem;
    }

    .summary-score {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.2rem;
    }

    .summary-average {
      font-size: 2.25rem;
      font-weight: 800;
      line-height: 1;
      color: var(--color-text);
      font-variant-numeric: tabular-nums;
    }

    .summary-bars {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 0.3rem;
      min-width: 12rem;
    }

    .bar-row {
      display: grid;
      grid-template-columns: 0.75rem minmax(0, 1fr) 2rem;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8rem;
      color: var(--color-text-muted);
    }

    .bar-track {
      height: 8px;
      border-radius: 999px;
      background: var(--color-chart-track);
      overflow: hidden;
    }

    .bar-fill {
      display: block;
      height: 100%;
      border-radius: 999px;
      background: var(--color-star);
    }

    .bar-count {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class ReviewSummaryComponent {
  readonly summary = input.required<ReviewSummary>();
  readonly showDistribution = input(true);

  readonly average = computed(() => ratingLabel(this.summary().average) || '—');
  readonly countLabel = computed(() => {
    const count = this.summary().count;
    const lastTwo = count % 100;
    const last = count % 10;
    const word = last === 1 && lastTwo !== 11 ? 'ocena' : last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? 'ocene' : 'ocena';
    return `${count.toLocaleString('sr-Latn-RS')} ${word}`;
  });

  percent(count: number): number {
    const total = this.summary().count;
    return total ? (count / total) * 100 : 0;
  }
}
