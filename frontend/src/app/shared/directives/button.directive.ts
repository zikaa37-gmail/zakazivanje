import { Directive, ElementRef, Renderer2, effect, inject, input } from '@angular/core';

export type ButtonTheme = 'primary' | 'secondary' | 'tertiary' | 'success' | 'danger' | 'neutral' | 'ghost';
export type ButtonSize = 's' | 'm' | 'l';

@Directive({
  selector: '[appBtn]',
  standalone: true,
})
export class ButtonDirective {
  readonly theme = input<ButtonTheme>('primary');
  readonly size = input<ButtonSize>('m');

  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private renderer = inject(Renderer2);

  private appliedThemeClass: string | null = null;
  private appliedSizeClass: string | null = null;

  constructor() {
    this.renderer.addClass(this.el.nativeElement, 'btn');

    effect(() => {
      const theme = this.theme();
      if (this.appliedThemeClass) this.renderer.removeClass(this.el.nativeElement, this.appliedThemeClass);
      this.appliedThemeClass = `btn-${theme}`;
      this.renderer.addClass(this.el.nativeElement, this.appliedThemeClass);
    });

    effect(() => {
      const size = this.size();
      if (this.appliedSizeClass) this.renderer.removeClass(this.el.nativeElement, this.appliedSizeClass);
      this.appliedSizeClass = `btn-${size}`;
      this.renderer.addClass(this.el.nativeElement, this.appliedSizeClass);
    });
  }
}
