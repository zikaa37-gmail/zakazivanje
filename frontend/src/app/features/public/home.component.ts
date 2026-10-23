import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GalleryImage } from '../../core/models/gallery.model';
import { PublicReviews } from '../../core/models/review.model';
import { AUDIENCE_OPTIONS, PublicService, ServiceAudience, categoriesOf, categoryOf, groupByCategory } from '../../core/models/service.model';
import { AuthService } from '../../core/services/auth.service';
import { WEEKDAYS } from '../../core/models/staff.model';
import { BookingService } from '../../core/services/booking.service';
import { BusinessSettingService } from '../../core/services/business-setting.service';
import { GalleryService } from '../../core/services/gallery.service';
import { ReviewService } from '../../core/services/review.service';
import { ReviewCardComponent } from '../../shared/components/review-card/review-card.component';
import { ReviewSummaryComponent } from '../../shared/components/review-summary/review-summary.component';
import { BookingDraftService } from './booking-draft.service';
import { SocialLinksComponent } from '../../shared/components/social-links/social-links.component';
import { IconDirective } from '../../shared/directives/icon.directive';
import { DurationPipe } from '../../shared/pipes/duration.pipe';
import { RsdPipe } from '../../shared/pipes/rsd.pipe';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, DurationPipe, IconDirective, ReviewCardComponent, ReviewSummaryComponent, RsdPipe, SocialLinksComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  private booking = inject(BookingService);
  private draft = inject(BookingDraftService);
  private gallery = inject(GalleryService);
  private reviewService = inject(ReviewService);
  protected business = inject(BusinessSettingService);

  readonly loading = signal(true);
  readonly services = signal<PublicService[]>([]);
  private auth = inject(AuthService);
  readonly audiences = AUDIENCE_OPTIONS;
  readonly audienceFilter = signal<ServiceAudience>(this.auth.currentUser()?.gender ?? 'all');
  readonly hasGendered = computed(() => this.services().some((s) => s.audience !== 'all'));
  readonly categoryFilter = signal<string | null>(null);
  readonly categories = computed(() => categoriesOf(this.shownServices()));
  readonly activeCategory = computed(() => {
    const filter = this.categoryFilter();
    return filter && this.categories().includes(filter) ? filter : null;
  });
  readonly serviceGroups = computed(() => {
    const category = this.activeCategory();
    return groupByCategory(category ? this.shownServices().filter((s) => categoryOf(s) === category) : this.shownServices());
  });
  readonly shownServices = computed(() => {
    const filter = this.audienceFilter();
    return filter === 'all' ? this.services() : this.services().filter((s) => s.audience === 'all' || s.audience === filter);
  });
  readonly photos = signal<GalleryImage[]>([]);
  readonly reviews = signal<PublicReviews | null>(null);
  readonly latestReviews = computed(() => (this.reviews()?.items ?? []).filter((r) => r.comment).slice(0, 3));

  readonly hours = computed(() =>
    (this.business.settings()?.opening_hours ?? []).map((h) => ({
      label: WEEKDAYS.find((w) => w.value === h.weekday)?.label ?? '',
      value: h.opens_at && h.closes_at ? `${h.opens_at} – ${h.closes_at}` : 'zatvoreno',
      closed: !h.opens_at,
    })),
  );

  readonly phoneHref = computed(() => {
    const phone = this.business.settings()?.phone;
    return phone ? `tel:${phone.replace(/\s/g, '')}` : null;
  });

  constructor() {
    this.booking.services().subscribe({
      next: (services) => {
        this.services.set(services);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.reviewService.publicList().subscribe({ next: (data) => this.reviews.set(data), error: () => this.reviews.set(null) });
    this.gallery.publicList().subscribe({ next: (images) => this.photos.set(images.slice(0, 6)), error: () => this.photos.set([]) });
  }

  photoSrc(image: GalleryImage): string {
    return this.gallery.src(image);
  }

  startWith(service: PublicService): void {
    this.draft.start([service.id]);
  }

  startEmpty(): void {
    this.draft.start([]);
  }
}
