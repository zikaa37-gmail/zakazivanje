import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GalleryImage } from '../../core/models/gallery.model';
import { BusinessSettingService } from '../../core/services/business-setting.service';
import { GalleryService } from '../../core/services/gallery.service';
import { ToastService } from '../../core/services/toast.service';
import { apiErrorMessage } from '../../core/utils/api-error';
import { GalleryViewerComponent } from '../../shared/components/gallery-viewer/gallery-viewer.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';

const SALON_FILTER = '__salon';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [RouterLink, ErrorMessageComponent, GalleryViewerComponent],
  templateUrl: './gallery.component.html',
  styleUrl: './gallery.component.scss',
})
export class GalleryComponent {
  private gallery = inject(GalleryService);
  private business = inject(BusinessSettingService);
  private toast = inject(ToastService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly images = signal<GalleryImage[]>([]);
  readonly filter = signal<string | null>(null);
  readonly open = signal<number | null>(null);

  readonly salonFilter = SALON_FILTER;
  readonly hasSalon = computed(() => this.images().some((image) => image.kind === 'salon'));
  readonly services = computed(() => [...new Set(this.images().map((image) => image.service_name).filter((name): name is string => !!name))]);
  readonly filterCount = computed(() => this.services().length + (this.hasSalon() ? 1 : 0));
  readonly shown = computed(() => {
    const filter = this.filter();
    if (filter === SALON_FILTER) return this.images().filter((image) => image.kind === 'salon');
    return filter ? this.images().filter((image) => image.service_name === filter) : this.images();
  });

  constructor() {
    this.gallery.publicList().subscribe({
      next: (images) => {
        this.images.set(images);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'Učitavanje galerije nije uspelo.'));
        this.loading.set(false);
      },
    });
  }

  readonly imageSrc = (image: GalleryImage) => this.gallery.src(image);

  src(image: GalleryImage): string {
    return this.gallery.src(image);
  }

  async share(image: GalleryImage): Promise<void> {
    const result = await this.gallery.share(image, this.business.name());
    if (result === 'downloaded') this.toast.success('Slika je preuzeta.');
  }
}
