import { Component, DestroyRef, ElementRef, computed, inject, input, output, signal } from '@angular/core';

export interface ColumnPoint {
  key: string;
  label: string;
  tooltipLabel: string;
  value: number;
}

const MARGIN = { top: 22, right: 8, bottom: 26, left: 44 };
const MAX_BAR = 24;
const RADIUS = 4;

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exponent = Math.pow(10, Math.floor(Math.log10(value)));
  const fraction = value / exponent;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * exponent;
}

@Component({
  selector: 'app-column-chart',
  standalone: true,
  templateUrl: './column-chart.component.html',
  styleUrl: './column-chart.component.scss',
})
export class ColumnChartComponent {
  readonly points = input.required<ColumnPoint[]>();
  readonly format = input<(value: number) => string>((value) => String(value));
  readonly tickFormat = input<(value: number) => string>((value) => (value >= 1000 ? `${Math.round(value / 100) / 10}K` : String(value)));
  readonly height = input(200);
  readonly ariaLabel = input('');
  readonly testId = input('', { alias: 'data-testid' });
  readonly actionLabel = input<string | null>(null);
  readonly opened = output<ColumnPoint>();
  private armed = false;

  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly width = signal(600);
  readonly active = signal<number | null>(null);
  readonly showTable = signal(false);

  readonly plotHeight = computed(() => this.height() - MARGIN.top - MARGIN.bottom);
  readonly max = computed(() => niceMax(Math.max(0, ...this.points().map((p) => p.value))));
  readonly ticks = computed(() => [0, this.max() / 2, this.max()].map((value) => ({ value, y: this.y(value), label: this.tickFormat()(value) })));

  readonly bars = computed(() => {
    const points = this.points();
    const plotWidth = this.width() - MARGIN.left - MARGIN.right;
    const band = points.length ? plotWidth / points.length : plotWidth;
    const barWidth = Math.max(2, Math.min(MAX_BAR, band - 2, band * 0.7));
    const maxIndex = points.reduce((best, p, i) => (p.value > (points[best]?.value ?? -1) ? i : best), 0);
    const labelEvery = Math.max(1, Math.ceil(34 / band));

    return points.map((p, i) => {
      const x = MARGIN.left + i * band + (band - barWidth) / 2;
      const top = this.y(p.value);
      const h = MARGIN.top + this.plotHeight() - top;
      return {
        point: p,
        index: i,
        bandX: MARGIN.left + i * band,
        band,
        x,
        width: barWidth,
        top,
        path: p.value > 0 ? this.barPath(x, top, barWidth, h) : '',
        center: x + barWidth / 2,
        showLabel: i % labelEvery === 0,
        isMax: p.value > 0 && i === maxIndex,
      };
    });
  });

  readonly activeBar = computed(() => {
    const index = this.active();
    return index === null ? null : this.bars()[index] ?? null;
  });

  readonly tooltipLeft = computed(() => {
    const bar = this.activeBar();
    if (!bar) return 0;
    return Math.min(Math.max(bar.center, 70), this.width() - 70);
  });

  constructor() {
    const observer = new ResizeObserver(([entry]) => this.width.set(Math.max(240, Math.floor(entry.contentRect.width))));
    observer.observe(this.host.nativeElement);
    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }

  onKeydown(event: KeyboardEvent): void {
    const count = this.points().length;
    if (!count) return;
    const current = this.active() ?? -1;
    if (event.key === 'ArrowRight') this.active.set(Math.min(count - 1, current + 1));
    else if (event.key === 'ArrowLeft') this.active.set(Math.max(0, current <= 0 ? 0 : current - 1));
    else if (event.key === 'Home') this.active.set(0);
    else if (event.key === 'End') this.active.set(count - 1);
    else if (event.key === 'Enter' && current >= 0 && this.actionLabel()) this.opened.emit(this.points()[current]);
    else return;
    event.preventDefault();
  }

  onPointerDown(event: PointerEvent, index: number): void {
    this.armed = event.pointerType === 'mouse' || this.active() === index;
    this.active.set(index);
  }

  onBarClick(index: number): void {
    if (this.armed && this.actionLabel()) this.opened.emit(this.points()[index]);
  }

  onFocus(): void {
    if (this.active() === null && this.points().length) this.active.set(this.points().length - 1);
  }

  private y(value: number): number {
    return MARGIN.top + this.plotHeight() - (value / this.max()) * this.plotHeight();
  }

  private barPath(x: number, top: number, width: number, height: number): string {
    const r = Math.min(RADIUS, width / 2, height);
    const bottom = top + height;
    return `M${x},${bottom} V${top + r} Q${x},${top} ${x + r},${top} H${x + width - r} Q${x + width},${top} ${x + width},${top + r} V${bottom} Z`;
  }

  protected readonly margin = MARGIN;
}
