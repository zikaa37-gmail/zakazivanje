import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicReviews } from '../../core/models/review.model';
import { ReviewService } from '../../core/services/review.service';
import { apiErrorMessage } from '../../core/utils/api-error';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { ReviewCardComponent } from '../../shared/components/review-card/review-card.component';
import { ReviewSummaryComponent } from '../../shared/components/review-summary/review-summary.component';

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [RouterLink, ErrorMessageComponent, ReviewCardComponent, ReviewSummaryComponent],
  template: `
    <div class="content-container py-4 md:py-8 flex flex-col gap-4 max-w-3xl">
      <div>
        <h1 class="page-title">Utisci klijenata</h1>
        <p class="page-subtitle">Ocene posle završenih termina</p>
      </div>
      <app-error-message [message]="error()" />
      @if (loading() && !data()) {
      } @else if (!data()?.enabled || items().length === 0) {
        <div class="card empty-state">Još nema ocena.</div>
      } @else {
        <div class="card"><app-review-summary [summary]="data()!.summary" /></div>
        <div class="card flex flex-col divide-y divide-[var(--color-border)] !py-1">
          @for (review of items(); track review.id) {
            <div class="py-4"><app-review-card [review]="review" /></div>
          }
        </div>
      }
      <a routerLink="/book" class="hero-cta self-center">Zakaži termin</a>
    </div>
  `,
})
export class ReviewsComponent {
  private reviews = inject(ReviewService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly data = signal<PublicReviews | null>(null);
  readonly items = computed(() => this.data()?.items ?? []);

  constructor() {
    this.reviews.publicList().subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'Učitavanje ocena nije uspelo.'));
        this.loading.set(false);
      },
    });
  }
}
