const WEEKDAY_SHORT = ['Ned', 'Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub'];
const WEEKDAY_LONG = ['Nedelja', 'Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota'];
const MONTHS = ['januar', 'februar', 'mart', 'april', 'maj', 'jun', 'jul', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar'];
const MONTHS_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAJ', 'JUN', 'JUL', 'AVG', 'SEP', 'OKT', 'NOV', 'DEC'];

export function isoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseDate(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(value: string, days: number): string {
  const date = parseDate(value);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

export function today(): string {
  return isoDate(new Date());
}

export function weekdayShort(value: string): string {
  return WEEKDAY_SHORT[parseDate(value).getDay()];
}

export function weekdayLong(value: string): string {
  return WEEKDAY_LONG[parseDate(value).getDay()];
}

export function monthShort(value: string): string {
  return MONTHS_SHORT[parseDate(value).getMonth()];
}

export function longDate(value: string): string {
  const date = parseDate(value);
  return `${WEEKDAY_LONG[date.getDay()]}, ${date.getDate()}. ${MONTHS[date.getMonth()]} ${date.getFullYear()}.`;
}

export function monthLabel(value: string): string {
  const name = MONTHS[parseDate(value).getMonth()];
  return `${name[0].toUpperCase()}${name.slice(1)} ${parseDate(value).getFullYear()}.`;
}

export function timeOf(dateTime: string): string {
  return dateTime.slice(11, 16);
}
