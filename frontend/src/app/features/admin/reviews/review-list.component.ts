import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AdminReviews, Review, ratingLabel } from '../../../core/models/review.model';
import { ReviewService } from '../../../core/services/review.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ReviewSummaryComponent } from '../../../shared/components/review-summary/review-summary.component';
import { StarsComponent } from '../../../shared/components/stars/stars.component';
import { ButtonDirective } from '../../../shared/directives/button.directive';
import { IconDirective } from '../../../shared/directives/icon.directive';
import { InputDirective } from '../../../shared/directives/input.directive';
import { SrDatePipe } from '../../../shared/pipes/sr-date.pipe';

type VisibilityFilter = 'all' | 'visible' | 'hidden';

@Component({
  selector: 'app-review-list',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, ButtonDirective, ErrorMessageComponent, IconDirective, InputDirective, ModalComponent, ReviewSummaryComponent, SrDatePipe, StarsComponent],
  templateUrl: './review-list.component.html',
})
export class ReviewListComponent {
  private reviews = inject(ReviewService);
  private toast = inject(ToastService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly data = signal<AdminReviews | null>(null);
  readonly rating = signal<number | null>(null);
  readonly staffId = signal<number | null>(null);
  readonly visibility = signal<VisibilityFilter>('all');
  readonly replying = signal<Review | null>(null);
  readonly saving = signal(false);
  readonly reply = new FormControl<string | null>(null);

  readonly items = computed(() => this.data()?.items ?? []);
  readonly ratings = [5, 4, 3, 2, 1];
  readonly ratingLabel = ratingLabel;

  constructor() {
    effect(() => {
      const filters = { rating: this.rating(), staff_member_id: this.staffId(), visibility: this.visibility() };
      untracked(() => this.load(filters.rating, filters.staff_member_id, filters.visibility));
    });
  }

  services(review: Review): string {
    return review.appointment?.items.map((i) => i.name).join(' + ') ?? '';
  }

  toggleVisible(review: Review): void {
    this.reviews.update(review.id, { visible: !review.visible }).subscribe({
      next: (saved) => {
        this.replace(saved);
        this.toast.success(saved.visible ? 'Recenzija se prikazuje na sajtu.' : 'Recenzija je sakrivena sa sajta.');
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Izmena nije uspela.')),
    });
  }

  openReply(review: Review): void {
    this.reply.setValue(review.reply);
    this.replying.set(review);
  }

  saveReply(): void {
    const review = this.replying();
    if (!review) return;
    this.saving.set(true);
    this.reviews.update(review.id, { reply: this.reply.value?.trim() || null }).subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.replace(saved);
        this.replying.set(null);
        this.toast.success(saved.reply ? 'Odgovor je objavljen.' : 'Odgovor je uklonjen.');
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(apiErrorMessage(err, 'Čuvanje odgovora nije uspelo.'));
      },
    });
  }

  private replace(saved: Review): void {
    this.data.update((data) => (data ? { ...data, items: data.items.map((item) => (item.id === saved.id ? saved : item)) } : data));
  }

  private load(rating: number | null, staffId: number | null, visibility: VisibilityFilter): void {
    this.loading.set(true);
    this.error.set(null);
    this.reviews.list({ rating, staff_member_id: staffId, visible: visibility === 'all' ? null : visibility === 'visible' }).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'Učitavanje recenzija nije uspelo.'));
        this.loading.set(false);
      },
    });
  }
}
