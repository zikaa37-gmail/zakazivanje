import { Component, input } from '@angular/core';

@Component({
  selector: 'app-data-row',
  standalone: true,
  templateUrl: './data-row.component.html',
  styleUrl: './data-row.component.scss',
  host: {
    class: 'data-row',
    '[style.grid-template-columns]': 'columns()',
  },
})
export class DataRowComponent {
  readonly columns = input.required<string>();
}
