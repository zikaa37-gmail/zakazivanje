import { Directive, ElementRef, Renderer2, effect, inject, input } from '@angular/core';

export type InputSize = 's' | 'm';

@Directive({
  selector: '[appInput]',
  standalone: true,
})
export class InputDirective {
  readonly size = input<InputSize>('s');

  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private renderer = inject(Renderer2);

  private appliedSizeClass: string | null = null;

  constructor() {
    this.renderer.addClass(this.el.nativeElement, 'form-input');

    effect(() => {
      const size = this.size();
      if (this.appliedSizeClass) this.renderer.removeClass(this.el.nativeElement, this.appliedSizeClass);
      this.appliedSizeClass = `form-input-${size}`;
      this.renderer.addClass(this.el.nativeElement, this.appliedSizeClass);
    });
  }
}
