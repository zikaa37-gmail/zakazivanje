import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { GalleryImage } from '../../../core/models/gallery.model';
import { Promotion } from '../../../core/models/promotion.model';
import { SalonService } from '../../../core/models/service.model';
import { INSTAGRAM_PLACEMENTS, INSTAGRAM_POST_STATUS, InstagramPostKind, ScheduledInstagramPost } from '../../../core/models/marketing.model';
import { BusinessSettingService } from '../../../core/services/business-setting.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { MarketingService, slug } from '../../../core/services/marketing.service';
import { GalleryService } from '../../../core/services/gallery.service';
import { PromotionService } from '../../../core/services/promotion.service';
import { ServiceCatalogService } from '../../../core/services/service-catalog.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { isHexColor, mix, readableTextOn } from '../../../core/utils/color';
import { socialLinks } from '../../../core/utils/social';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ButtonDirective } from '../../../shared/directives/button.directive';
import { IconDirective } from '../../../shared/directives/icon.directive';
import { InputDirective } from '../../../shared/directives/input.directive';
import { RsdPipe } from '../../../shared/pipes/rsd.pipe';
import { SrDateTimePipe } from '../../../shared/pipes/sr-date-time.pipe';
import { Brand, IMAGE_SIZES, ImageFormat, ShareTemplate, drawShareImage } from './share-image';

type TemplateKind = ShareTemplate['kind'];

interface QrCode {
  url: string;
  png: string;
  svg: string;
}

const DEFAULT_PRIMARY = '#0f766e';

@Component({
  selector: 'app-share',
  standalone: true,
  imports: [ButtonComponent, ButtonDirective, ErrorMessageComponent, IconDirective, InputDirective, ModalComponent, SrDateTimePipe],
  templateUrl: './share.component.html',
  styleUrl: './share.component.scss',
})
export class ShareComponent {
  private http = inject(HttpClient);
  private business = inject(BusinessSettingService);
  private gallery = inject(GalleryService);
  private promotionService = inject(PromotionService);
  private catalog = inject(ServiceCatalogService);
  private toast = inject(ToastService);
  private marketing = inject(MarketingService);
  private confirm = inject(ConfirmService);
  private rsd = new RsdPipe();

  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  readonly origin = window.location.origin;
  readonly target = signal('book');
  readonly customUrl = signal('');
  readonly qr = signal<QrCode | null>(null);
  readonly qrError = signal<string | null>(null);

  readonly formats = (Object.keys(IMAGE_SIZES) as ImageFormat[]).map((id) => ({ id, label: `${IMAGE_SIZES[id].label} · ${IMAGE_SIZES[id].width}×${IMAGE_SIZES[id].height}` }));
  readonly templates: { id: TemplateKind; label: string }[] = [
    { id: 'book', label: 'Zakaži online' },
    { id: 'promotion', label: 'Akcija' },
    { id: 'prices', label: 'Cenovnik' },
    { id: 'photo', label: 'Slika iz galerije' },
  ];
  readonly format = signal<ImageFormat>('portrait');
  readonly template = signal<TemplateKind>('book');
  readonly promotions = signal<Promotion[]>([]);
  readonly promotionId = signal<number | null>(null);
  readonly services = signal<SalonService[]>([]);
  readonly category = signal<string>('');
  readonly photos = signal<GalleryImage[]>([]);
  readonly photoId = signal<number | null>(null);
  readonly caption = signal('');
  readonly postStatus = INSTAGRAM_POST_STATUS;
  readonly canPublish = computed(() => !!this.business.settings()?.instagram_connected && !!this.business.settings()?.instagram_publishing_enabled);
  readonly publishOpen = signal(false);
  readonly publishKind = signal<InstagramPostKind>('post');
  readonly publishCaption = signal('');
  readonly publishLater = signal(false);
  readonly publishAt = signal('');
  readonly publishing = signal(false);
  readonly publishError = signal<string | null>(null);
  readonly posts = signal<ScheduledInstagramPost[]>([]);
  readonly postsLoading = signal(false);
  private readonly images = signal<{ logo: HTMLImageElement | null; bookQr: HTMLImageElement | null; photo: HTMLImageElement | null }>({ logo: null, bookQr: null, photo: null });

  readonly social = computed(() => socialLinks(this.business.settings()));
  readonly targets = computed(() => [
    { value: 'book', label: 'Zakazivanje termina' },
    { value: 'home', label: 'Početna stranica (usluge i cene)' },
    { value: 'gallery', label: 'Galerija' },
    ...this.social().map((link) => ({ value: link.network, label: link.label })),
    { value: 'custom', label: 'Drugi link…' },
  ]);

  readonly targetUrl = computed(() => {
    const target = this.target();
    if (target === 'custom') return this.customUrl().trim();
    const link = this.social().find((item) => item.network === target);
    if (link) return link.url;
    const paths: Record<string, string> = { book: '/book', home: '/', gallery: '/gallery' };
    return this.marketing.link(this.origin + (paths[target] ?? '/'), 'qr', target);
  });

  readonly placements = INSTAGRAM_PLACEMENTS;
  readonly igPlacement = signal('bio');
  readonly igCampaign = signal('');
  readonly igPage = signal<'home' | 'book'>('home');
  readonly igLink = computed(() =>
    this.marketing.link(this.origin + (this.igPage() === 'book' ? '/book' : '/'), 'instagram', [this.igPlacement(), slug(this.igCampaign(), 40)].filter(Boolean).join('-')),
  );

  readonly categories = computed(() => [...new Set(this.services().filter((s) => s.active).map((s) => s.category || 'Ostalo'))]);
  readonly activePromotions = computed(() => this.promotions().filter((p) => p.active && (!p.ends_on || p.ends_on >= new Date().toISOString().slice(0, 10))));
  readonly promotion = computed(() => this.activePromotions().find((p) => p.id === this.promotionId()) ?? null);
  readonly photo = computed(() => this.photos().find((p) => p.id === this.photoId()) ?? null);

  readonly brand = computed<Brand>(() => {
    const settings = this.business.settings();
    const theme = settings?.theme_primary;
    const primary = isHexColor(theme) ? theme : DEFAULT_PRIMARY;
    const dark = mix(primary, '#000000', 0.35);
    const instagram = this.social().find((link) => link.network === 'instagram');
    return {
      name: this.business.name(),
      handle: instagram?.handle ?? window.location.host,
      primary,
      dark,
      onPrimary: readableTextOn(primary, dark),
      font: getComputedStyle(document.body).fontFamily || 'sans-serif',
      logo: this.images().logo,
    };
  });

  readonly shareTemplate = computed<ShareTemplate>(() => {
    const kind = this.template();
    if (kind === 'promotion') {
      const p = this.promotion();
      return { kind, title: p?.name ?? 'Izaberi akciju', value: p ? this.promotionValue(p) : '', scope: p ? (p.services.length ? p.services.map((s) => s.name).join(', ') : 'Sve usluge') : '', period: p ? this.period(p) : '', code: p?.code ?? null };
    }
    if (kind === 'prices') {
      const category = this.category();
      const rows = this.services()
        .filter((s) => s.active && (!category || (s.category || 'Ostalo') === category))
        .map((s) => ({ name: s.name, price: this.rsd.transform(s.price) }));
      return { kind, title: category || 'Cenovnik', rows };
    }
    if (kind === 'photo') return { kind, photo: this.images().photo, caption: this.caption().trim() };
    return { kind: 'book', qr: this.images().bookQr, host: `${window.location.host}/book` };
  });

  constructor() {
    this.makeQr();
    this.loadBookQr();
    this.promotionService.list().subscribe((list) => {
      this.promotions.set(list);
      this.promotionId.set(this.activePromotions()[0]?.id ?? null);
    });
    this.catalog.list().subscribe((list) => this.services.set(list));
    this.gallery.list().subscribe((list) => {
      const visible = list.filter((image) => image.visible);
      this.photos.set(visible);
      if (visible[0]) this.selectPhoto(visible[0].id);
    });
    effect(() => {
      if (this.canPublish()) this.loadPosts();
    });
    effect(() => {
      const logo = this.business.logo();
      if (!logo) return;
      this.loadImage(logo).then((image) => this.images.update((all) => ({ ...all, logo: image })));
    });
    effect(() => {
      const canvas = this.canvas()?.nativeElement;
      if (canvas) drawShareImage(canvas, this.format(), this.brand(), this.shareTemplate());
    });
  }

  gallerySrc(image: GalleryImage): string {
    return this.gallery.src(image);
  }

  setTarget(value: string): void {
    this.target.set(value);
    if (value !== 'custom') this.makeQr();
  }

  makeQr(): void {
    const url = this.targetUrl();
    if (!url) return;
    this.qrError.set(null);
    this.http.post<QrCode>(`${environment.apiUrl}/share/qr`, { url }).subscribe({
      next: (qr) => this.qr.set(qr),
      error: (err) => this.qrError.set(apiErrorMessage(err, 'QR kod nije napravljen.')),
    });
  }

  downloadQr(kind: 'png' | 'svg'): void {
    const qr = this.qr();
    if (!qr) return;
    const href = kind === 'png' ? qr.png : URL.createObjectURL(new Blob([qr.svg], { type: 'image/svg+xml' }));
    this.download(href, `qr-${this.target()}.${kind}`);
  }

  async copyLink(url = this.targetUrl()): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      this.toast.success('Link je kopiran.');
    } catch {
      this.toast.error('Kopiranje nije uspelo.');
    }
  }

  selectPhoto(id: number): void {
    this.photoId.set(id);
    const photo = this.photos().find((p) => p.id === id);
    this.caption.set(photo?.caption ?? '');
    if (!photo) return;
    this.loadImage(this.gallery.src(photo), true).then((image) => this.images.update((all) => ({ ...all, photo: image })));
  }

  downloadImage(): void {
    const canvas = this.canvas()?.nativeElement;
    if (canvas) this.download(canvas.toDataURL('image/png'), this.fileName());
  }

  async shareImage(): Promise<void> {
    const canvas = this.canvas()?.nativeElement;
    if (!canvas) return;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return;
    const file = new File([blob], this.fileName(), { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: this.business.name() });
      } catch {
        return;
      }
      return;
    }
    this.toast.success('Ovaj pregledač ne deli slike direktno — slika je preuzeta, objavi je iz galerije telefona.');
    this.downloadImage();
  }

  openPublish(): void {
    this.publishKind.set(this.format() === 'story' ? 'story' : 'post');
    const code = this.template() === 'promotion' ? this.promotion()?.code : null;
    this.publishCaption.set(
      this.publishCaption() ||
        (code ? `Zakaži online i unesi kod ${code} — ili otvori ${window.location.host}/book?kod=${code}. Link je u biju.` : 'Zakaži termin online — link je u biju.'),
    );
    this.publishLater.set(false);
    this.publishAt.set(this.localDateTime(new Date(Date.now() + 60 * 60 * 1000)));
    this.publishError.set(null);
    this.publishOpen.set(true);
  }

  publish(): void {
    const canvas = this.canvas()?.nativeElement;
    if (!canvas) return;
    const kind = this.publishKind();
    if (kind === 'post' && this.format() === 'story') {
      this.publishError.set('Za objavu izaberi format 4:5 ili kvadrat — format story ide samo kao story.');
      return;
    }
    if (this.publishLater() && !this.publishAt()) {
      this.publishError.set('Izaberi datum i vreme objave.');
      return;
    }
    this.publishing.set(true);
    this.publishError.set(null);
    this.marketing
      .publishToInstagram({
        kind,
        caption: kind === 'post' ? this.publishCaption().trim() || null : null,
        image: canvas.toDataURL('image/jpeg', 0.92),
        scheduled_at: this.publishLater() ? new Date(this.publishAt()).toISOString() : null,
      })
      .subscribe({
        next: (post) => {
          this.publishing.set(false);
          this.loadPosts();
          if (post.status === 'failed') {
            this.publishError.set(post.error ?? 'Objava nije uspela.');
            return;
          }
          this.publishOpen.set(false);
          this.toast.success(post.status === 'published' ? 'Objavljeno na Instagramu.' : 'Objava je zakazana.');
        },
        error: (err) => {
          this.publishing.set(false);
          this.publishError.set(apiErrorMessage(err, 'Objava nije uspela.'));
        },
      });
  }

  retryPost(post: ScheduledInstagramPost): void {
    this.marketing.retryInstagramPost(post.id).subscribe({
      next: (updated) => {
        this.posts.update((list) => list.map((p) => (p.id === updated.id ? updated : p)));
        if (updated.status === 'published') this.toast.success('Objavljeno na Instagramu.');
        else this.toast.error(updated.error ?? 'Objava nije uspela.');
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Objava nije uspela.')),
    });
  }

  async deletePost(post: ScheduledInstagramPost): Promise<void> {
    const scheduled = post.status === 'scheduled';
    const ok = await this.confirm.confirm({
      title: scheduled ? 'Otkazivanje objave' : 'Brisanje iz spiska',
      message: scheduled ? 'Zakazana objava neće biti objavljena.' : 'Objava se uklanja iz spiska.',
      confirmLabel: scheduled ? 'Otkaži objavu' : 'Obriši',
      danger: true,
    });
    if (!ok) return;
    this.marketing.deleteInstagramPost(post.id).subscribe({
      next: () => this.posts.update((list) => list.filter((p) => p.id !== post.id)),
      error: (err) => this.toast.error(apiErrorMessage(err, 'Brisanje nije uspelo.')),
    });
  }

  rangeLabel(range: { from: string; to: string }): string {
    return range.from === range.to ? range.from : `${range.from}–${range.to}`;
  }

  private loadPosts(): void {
    this.postsLoading.set(true);
    this.marketing.scheduledPosts().subscribe({
      next: (list) => {
        this.posts.set(list);
        this.postsLoading.set(false);
      },
      error: () => this.postsLoading.set(false),
    });
  }

  private localDateTime(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private loadBookQr(): void {
    this.http.post<QrCode>(`${environment.apiUrl}/share/qr`, { url: this.marketing.link(`${this.origin}/book`, 'instagram', 'slika') }).subscribe({
      next: (qr) => this.loadImage(qr.png).then((image) => this.images.update((all) => ({ ...all, bookQr: image }))),
    });
  }

  private loadImage(src: string, crossOrigin = false): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const image = new Image();
      if (crossOrigin) image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = src;
    });
  }

  private promotionValue(p: Promotion): string {
    switch (p.type) {
      case 'discount_percent':
        return `−${p.discount_percent}%`;
      case 'discount_amount':
        return `−${this.rsd.transform(p.discount_amount)}`;
      case 'package':
        return this.rsd.transform(p.package_price);
      case 'bundle':
        return `${p.buy_quantity} + ${p.free_quantity} gratis`;
      case 'loyalty':
        return p.discount_percent === 100 ? `${p.loyalty_visits}. poseta gratis` : `${p.loyalty_visits}. poseta −${p.discount_percent}%`;
    }
  }

  private period(p: Promotion): string {
    const format = (date: string) => date.split('-').reverse().join('.') + '.';
    if (p.starts_on && p.ends_on) return `${format(p.starts_on)} – ${format(p.ends_on)}`;
    if (p.ends_on) return `do ${format(p.ends_on)}`;
    if (p.starts_on) return `od ${format(p.starts_on)}`;
    return '';
  }

  private fileName(): string {
    return `${this.template()}-${this.format()}.png`;
  }

  private download(href: string, name: string): void {
    const link = document.createElement('a');
    link.href = href;
    link.download = name;
    link.click();
  }
}
