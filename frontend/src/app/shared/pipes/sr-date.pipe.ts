import { Pipe, PipeTransform } from '@angular/core';
import { formatSrDate } from '../../core/utils/format';

@Pipe({ name: 'srDate' })
export class SrDatePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return formatSrDate(value);
  }
}
