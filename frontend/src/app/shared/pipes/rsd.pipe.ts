import { Pipe, PipeTransform } from '@angular/core';
import { formatRsd } from '../../core/utils/format';

@Pipe({ name: 'rsd' })
export class RsdPipe implements PipeTransform {
  transform(value: string | number | null | undefined): string {
    return formatRsd(value);
  }
}
