import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-toggle',
  standalone: true,
  templateUrl: './toggle.component.html',
  styleUrl: './toggle.component.scss',
})
export class ToggleComponent {
  readonly checked = input(false);
  readonly label = input('');
  readonly disabled = input(false);
  readonly testId = input('', { alias: 'data-testid' });

  readonly checkedChange = output<boolean>();

  onChange(event: Event): void {
    this.checkedChange.emit((event.target as HTMLInputElement).checked);
  }
}
