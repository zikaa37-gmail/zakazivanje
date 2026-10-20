import { Directive, ElementRef, Renderer2, effect, inject, input } from '@angular/core';
import { IconService } from '../services/icon.service';

const ICON_NAMES = [
  'plus',
  'menu',
  'close',
  'edit',
  'trash',
  'search',
  'check',
  'send',
  'download',
  'link',
  'star',
  'instagram',
  'facebook',
  'youtube',
  'tv',
  'help-circle',
  'tiktok',
  'share',
  'book-open',
  'qr',
  'lock',
  'unlock',
  'bell',
  'calendar',
  'paperclip',
  'home',
  'folder',
  'clock',
  'inbox',
  'mail',
  'users',
  'user',
  'briefcase',
  'image',
  'file-text',
  'sliders',
  'tag',
  'coins',
  'layout',
  'logout',
  'check-square',
  'message-square',
  'eye',
  'more-vertical',
  'phone',
  'award',
  'info',
  'chevron-down',
  'alert-triangle',
  'upload',
  'copy',
  'wand',
  'arrow-right',
  'arrow-left',
  'rotate-ccw',
  'activity',
] as const;

export type IconName = (typeof ICON_NAMES)[number];

@Directive({
  selector: '[appIcon]',
  standalone: true,
})
export class IconDirective {
  readonly name = input.required<IconName>({ alias: 'appIcon' });
  readonly iconColor = input<string>();
  readonly iconSize = input(16);

  private iconService = inject(IconService);
  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private renderer = inject(Renderer2);

  constructor() {
    this.renderer.setStyle(this.el.nativeElement, 'display', 'inline-flex');
    this.renderer.setStyle(this.el.nativeElement, 'flex-shrink', '0');

    effect((onCleanup) => {
      const color = this.iconColor();
      const size = this.iconSize();
      const name = this.name();

      if (color) this.renderer.setStyle(this.el.nativeElement, 'color', color);

      const subscription = this.iconService.load(name).subscribe((svg) => {
        this.el.nativeElement.innerHTML = svg;
        const svgEl = this.el.nativeElement.querySelector('svg');
        if (svgEl) {
          svgEl.setAttribute('width', String(size));
          svgEl.setAttribute('height', String(size));
        }
      });

      onCleanup(() => subscription.unsubscribe());
    });
  }
}
