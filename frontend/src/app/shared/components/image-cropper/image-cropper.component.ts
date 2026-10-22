import { AfterViewInit, Component, ElementRef, OnDestroy, computed, input, output, signal, viewChild } from '@angular/core';
import { ButtonDirective } from '../../directives/button.directive';
import { ModalComponent } from '../modal/modal.component';

@Component({
  selector: 'app-image-cropper',
  standalone: true,
  imports: [ButtonDirective, ModalComponent],
  templateUrl: './image-cropper.component.html',
  styleUrl: './image-cropper.component.scss',
})
export class ImageCropperComponent implements AfterViewInit, OnDestroy {
  readonly file = input.required<File>();
  readonly aspect = input(16 / 9);
  readonly outputWidth = input(1600);
  readonly title = input('Iseci fotografiju');

  readonly cropped = output<string>();
  readonly cancelled = output<void>();

  private readonly frame = viewChild.required<ElementRef<HTMLElement>>('frame');
  private image: HTMLImageElement | null = null;
  private url: string | null = null;
  private drag: { x: number; y: number; ox: number; oy: number } | null = null;

  readonly ready = signal(false);
  readonly zoom = signal(1);
  readonly offset = signal({ x: 0, y: 0 });
  readonly frameSize = signal({ width: 0, height: 0 });
  readonly natural = signal({ width: 1, height: 1 });

  readonly baseScale = computed(() => {
    const { width, height } = this.frameSize();
    const n = this.natural();
    return Math.max(width / n.width, height / n.height);
  });
  readonly transform = computed(() => {
    const scale = this.baseScale() * this.zoom();
    const { x, y } = this.offset();
    return `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`;
  });

  ngAfterViewInit(): void {
    this.url = URL.createObjectURL(this.file());
    const image = new Image();
    image.onload = () => {
      this.image = image;
      this.natural.set({ width: image.naturalWidth, height: image.naturalHeight });
      this.measure();
      this.ready.set(true);
    };
    image.src = this.url;
  }

  ngOnDestroy(): void {
    if (this.url) URL.revokeObjectURL(this.url);
  }

  src(): string {
    return this.url ?? '';
  }

  onPointerDown(event: PointerEvent): void {
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    const { x, y } = this.offset();
    this.drag = { x: event.clientX, y: event.clientY, ox: x, oy: y };
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.drag) return;
    this.setOffset(this.drag.ox + event.clientX - this.drag.x, this.drag.oy + event.clientY - this.drag.y);
  }

  onPointerUp(): void {
    this.drag = null;
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.setZoom(this.zoom() * (event.deltaY < 0 ? 1.08 : 1 / 1.08));
  }

  onKey(event: KeyboardEvent): void {
    const step = 12;
    const { x, y } = this.offset();
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    this.setOffset(x + move[0], y + move[1]);
  }

  setZoom(value: number): void {
    this.zoom.set(Math.min(4, Math.max(1, value)));
    const { x, y } = this.offset();
    this.setOffset(x, y);
  }

  save(): void {
    if (!this.image) return;
    const { width, height } = this.frameSize();
    const scale = this.baseScale() * this.zoom();
    const { x, y } = this.offset();
    const sourceWidth = width / scale;
    const sourceHeight = height / scale;
    const sx = this.natural().width / 2 - x / scale - sourceWidth / 2;
    const sy = this.natural().height / 2 - y / scale - sourceHeight / 2;
    const outWidth = Math.min(this.outputWidth(), Math.round(sourceWidth));
    const canvas = document.createElement('canvas');
    canvas.width = outWidth;
    canvas.height = Math.round(outWidth / this.aspect());
    canvas.getContext('2d')!.drawImage(this.image, sx, sy, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
    this.cropped.emit(canvas.toDataURL('image/jpeg', 0.85));
  }

  private measure(): void {
    const rect = this.frame().nativeElement.getBoundingClientRect();
    this.frameSize.set({ width: rect.width, height: rect.height });
  }

  private setOffset(x: number, y: number): void {
    const { width, height } = this.frameSize();
    const scale = this.baseScale() * this.zoom();
    const maxX = Math.max(0, (this.natural().width * scale - width) / 2);
    const maxY = Math.max(0, (this.natural().height * scale - height) / 2);
    this.offset.set({ x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) });
  }
}
