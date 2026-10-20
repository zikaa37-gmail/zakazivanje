import { Component, inject, input } from '@angular/core';
import { LoaderService } from '../../../core/services/loader.service';

@Component({
  selector: 'app-spinner',
  standalone: true,
  templateUrl: './spinner.component.html',
  styleUrl: './spinner.component.scss',
})
export class SpinnerComponent {
  readonly size = input(16);
  readonly overlay = input(false);

  protected loader = inject(LoaderService);
}
