import { Component, computed, input } from '@angular/core';
import { SpinnerComponent } from '../spinner/spinner.component';

export type ButtonTheme = 'primary' | 'secondary' | 'tertiary' | 'success' | 'danger' | 'neutral' | 'ghost';
export type ButtonSize = 's' | 'm' | 'l';

const SPINNER_SIZE: Record<ButtonSize, number> = { s: 12, m: 16, l: 18 };

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [SpinnerComponent],
  templateUrl: './button.component.html',
})
export class ButtonComponent {
  readonly theme = input<ButtonTheme>('primary');
  readonly size = input<ButtonSize>('m');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);
  readonly block = input(false);
  readonly loading = input(false);
  readonly testId = input<string | undefined>(undefined, { alias: 'data-testid' });
  readonly ariaLabel = input<string | undefined>(undefined, { alias: 'aria-label' });

  readonly spinnerSize = computed(() => SPINNER_SIZE[this.size()]);
}
