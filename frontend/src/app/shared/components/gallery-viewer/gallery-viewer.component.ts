import { AfterViewInit, Component, DestroyRef, ElementRef, computed, inject, input, output, viewChild } from '@angular/core';
import { GalleryImage } from '../../../core/models/gallery.model';
import { ButtonDirective } from '../../directives/button.directive';
import { IconDirective } from '../../directives/icon.directive';

@Component({
  selector: 'app-gallery-viewer',
  standalone: true,
  imports: [ButtonDirective, IconDirective],
  templateUrl: './gallery-viewer.component.html',
  styleUrl: './gallery-viewer.component.scss',
  host: {
    '(document:keydown)': 'onKey($event)',
  },
})
export class GalleryViewerComponent implements AfterViewInit {
  readonly images = input.required<GalleryImage[]>();
  readonly index = input.required<number>();
  readonly src = input.required<(image: GalleryImage) => string>();

  readonly indexChange = output<number>();
  readonly closed = output<void>();
  readonly shared = output<GalleryImage>();

  private readonly dialog = viewChild.required<ElementRef<HTMLElement>>('dialog');
  private touchX: number | null = null;
  private destroyRef = inject(DestroyRef);

  readonly image = computed(() => this.images()[this.index()] ?? null);
  readonly counter = computed(() => `${this.index() + 1} / ${this.images().length}`);

  ngAfterViewInit(): void {
    this.dialog().nativeElement.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    this.destroyRef.onDestroy(() => (document.body.style.overflow = overflow));
  }

  step(delta: number): void {
    const count = this.images().length;
    if (count < 2) return;
    this.indexChange.emit((this.index() + delta + count) % count);
  }

  onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.closed.emit();
    if (event.key === 'ArrowRight') this.step(1);
    if (event.key === 'ArrowLeft') this.step(-1);
  }

  onTouchStart(event: TouchEvent): void {
    this.touchX = event.touches[0]?.clientX ?? null;
  }

  onTouchEnd(event: TouchEvent): void {
    if (this.touchX === null) return;
    const delta = (event.changedTouches[0]?.clientX ?? this.touchX) - this.touchX;
    this.touchX = null;
    if (Math.abs(delta) > 50) this.step(delta < 0 ? 1 : -1);
  }

  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closed.emit();
  }
}
