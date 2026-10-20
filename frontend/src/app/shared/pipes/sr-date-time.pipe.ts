import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'srDateTime',
  standalone: true,
})
export class SrDateTimePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '—';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    const pad = (part: number) => String(part).padStart(2, '0');
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}
