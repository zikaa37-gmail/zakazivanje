import { Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { GalleryImage } from '../../core/models/gallery.model';
import { InstagramPost } from '../../core/models/marketing.model';
import { PublicReviews } from '../../core/models/review.model';
import { AUDIENCE_OPTIONS, PublicService, ServiceAudience, categoriesOf, categoryOf, groupByCategory } from '../../core/models/service.model';
import { WEEKDAYS } from '../../core/models/staff.model';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import { BusinessSettingService } from '../../core/services/business-setting.service';
import { GalleryService } from '../../core/services/gallery.service';
import { MarketingService } from '../../core/services/marketing.service';
import { ReviewService } from '../../core/services/review.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ReviewCardComponent } from '../../shared/components/review-card/review-card.component';
import { ReviewSummaryComponent } from '../../shared/components/review-summary/review-summary.component';
import { SocialLinksComponent } from '../../shared/components/social-links/social-links.component';
import { IconDirective } from '../../shared/directives/icon.directive';
import { DurationPipe } from '../../shared/pipes/duration.pipe';
import { RsdPipe } from '../../shared/pipes/rsd.pipe';
import { BookingDraftService } from './booking-draft.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, DurationPipe, IconDirective, ModalComponent, ReviewCardComponent, ReviewSummaryComponent, RsdPipe, SocialLinksComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  private booking = inject(BookingService);
  private draft = inject(BookingDraftService);
  private gallery = inject(GalleryService);
  private reviewService = inject(ReviewService);
  private marketing = inject(MarketingService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  protected auth = inject(AuthService);
  protected business = inject(BusinessSettingService);

  readonly loading = signal(true);
  readonly services = signal<PublicService[]>([]);
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

  readonly images = signal<GalleryImage[]>([]);
  readonly salonPhotos = computed(() => this.images().filter((i) => i.kind === 'salon'));
  readonly works = computed(() => {
    const works = this.images().filter((i) => i.kind !== 'salon');
    const featured = works.filter((i) => i.featured);
    return (featured.length ? featured : works).slice(0, 6);
  });
  readonly heroSrc = computed(() => {
    const salon = this.salonPhotos()[0];
    return this.business.coverSrc() ?? (salon ? this.gallery.src(salon) : null);
  });

  readonly reviews = signal<PublicReviews | null>(null);
  readonly rating = computed(() => {
    const r = this.reviews();
    return r?.enabled && r.summary.count > 0 && r.summary.average ? { average: r.summary.average.toLocaleString('sr-Latn-RS', { maximumFractionDigits: 1 }), count: r.summary.count } : null;
  });
  readonly latestReviews = computed(() => (this.reviews()?.items ?? []).filter((r) => r.comment).slice(0, 3));
  readonly instagramPosts = signal<InstagramPost[]>([]);
  readonly askAccount = signal(false);

  readonly hours = computed(() =>
    (this.business.settings()?.opening_hours ?? []).map((h) => ({
      weekday: h.weekday,
      label: WEEKDAYS.find((w) => w.value === h.weekday)?.label ?? '',
      value: h.opens_at && h.closes_at ? `${h.opens_at} – ${h.closes_at}` : 'zatvoreno',
      closed: !h.opens_at,
      today: h.weekday === (new Date().getDay() || 7),
    })),
  );
  readonly todayHours = computed(() => this.hours().find((h) => h.today) ?? null);

  readonly phoneHref = computed(() => {
    const phone = this.business.settings()?.phone;
    return phone ? `tel:${phone.replace(/\s/g, '')}` : null;
  });
  readonly fullAddress = computed(() => {
    const s = this.business.settings();
    return [s?.address, s?.city].filter(Boolean).join(', ');
  });
  readonly mapQuery = computed(() => {
    const s = this.business.settings();
    if (!s) return null;
    if (s.map_query?.trim()) return s.map_query.trim();
    return this.fullAddress() ? `${s.name}, ${this.fullAddress()}` : null;
  });
  readonly mapEmbed = computed(() => {
    const query = this.mapQuery();
    return query ? this.sanitizer.bypassSecurityTrustResourceUrl(`https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`) : null;
  });
  readonly directionsHref = computed(() => {
    const query = this.mapQuery();
    return query ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}` : null;
  });
  readonly instagramHandle = computed(() => this.business.settings()?.instagram_username ?? null);

  constructor() {
    this.booking.services().subscribe({
      next: (services) => {
        this.services.set(services);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.reviewService.publicList().subscribe({ next: (data) => this.reviews.set(data), error: () => this.reviews.set(null) });
    this.gallery.publicList().subscribe({ next: (images) => this.images.set(images), error: () => this.images.set([]) });
    this.marketing.instagramPosts().subscribe({ next: (posts) => this.instagramPosts.set(posts.slice(0, 6)), error: () => this.instagramPosts.set([]) });
  }

  photoSrc(image: GalleryImage): string {
    return this.gallery.src(image);
  }

  book(): void {
    this.draft.start([]);
    if (this.auth.isAuthenticated()) {
      this.router.navigateByUrl('/book');
      return;
    }
    this.askAccount.set(true);
  }

  goTo(path: string, withReturn: boolean): void {
    this.askAccount.set(false);
    this.router.navigate([path], withReturn ? { queryParams: { returnUrl: '/book' } } : {});
  }

  startWith(service: PublicService): void {
    this.draft.start([service.id]);
  }
}
