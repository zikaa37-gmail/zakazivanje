import { Component, input } from '@angular/core';

@Component({
  selector: 'app-data-list',
  standalone: true,
  templateUrl: './data-list.component.html',
  styleUrl: './data-list.component.scss',
})
export class DataListComponent {
  readonly columns = input.required<string>();
  readonly headers = input<string[]>([]);
  readonly testId = input('', { alias: 'data-testid' });
}
