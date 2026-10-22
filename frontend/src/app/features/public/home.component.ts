import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GalleryImage } from '../../core/models/gallery.model';
import { PublicService } from '../../core/models/service.model';
import { WEEKDAYS } from '../../core/models/staff.model';
import { BookingService } from '../../core/services/booking.service';
import { BusinessSettingService } from '../../core/services/business-setting.service';
import { GalleryService } from '../../core/services/gallery.service';
import { BookingDraftService } from './booking-draft.service';
import { SocialLinksComponent } from '../../shared/components/social-links/social-links.component';
import { IconDirective } from '../../shared/directives/icon.directive';
import { DurationPipe } from '../../shared/pipes/duration.pipe';
import { RsdPipe } from '../../shared/pipes/rsd.pipe';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, DurationPipe, IconDirective, RsdPipe, SocialLinksComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  private booking = inject(BookingService);
  private draft = inject(BookingDraftService);
  private gallery = inject(GalleryService);
  protected business = inject(BusinessSettingService);

  readonly loading = signal(true);
  readonly services = signal<PublicService[]>([]);
  readonly photos = signal<GalleryImage[]>([]);

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
