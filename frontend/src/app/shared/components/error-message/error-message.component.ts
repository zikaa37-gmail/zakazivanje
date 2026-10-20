import { Component, input } from '@angular/core';

@Component({
  selector: 'app-error-message',
  standalone: true,
  templateUrl: './error-message.component.html',
})
export class ErrorMessageComponent {
  readonly message = input<string | null>(null);
  readonly testId = input<string | undefined>(undefined, { alias: 'data-testid' });
}
