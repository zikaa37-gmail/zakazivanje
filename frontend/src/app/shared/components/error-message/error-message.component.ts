import { Component, ElementRef, effect, input, viewChild } from '@angular/core';

@Component({
  selector: 'app-error-message',
  standalone: true,
  templateUrl: './error-message.component.html',
})
export class ErrorMessageComponent {
  readonly message = input<string | null>(null);
  readonly testId = input<string | undefined>(undefined, { alias: 'data-testid' });
  private readonly banner = viewChild<ElementRef<HTMLElement>>('banner');

  constructor() {
    effect(() => {
      this.message();
      this.banner()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }
}
