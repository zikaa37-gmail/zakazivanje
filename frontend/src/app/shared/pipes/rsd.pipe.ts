import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'rsd',
  standalone: true,
})
export class RsdPipe implements PipeTransform {
  transform(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') return '—';

    const num = Number(value);
    if (Number.isNaN(num)) return '—';

    const formatted = num.toLocaleString('sr-Latn-RS', {
      minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
      maximumFractionDigits: 2,
    });
    return `${formatted} din.`;
  }
}
