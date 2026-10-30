import { isoDate, today } from './dates';

export interface PromoPreset {
  key: string;
  label: string;
  name: string;
  code: string;
  percent: number;
  description: string;
  oncePerClient: boolean;
  range: (year: number) => [Date, Date] | null;
}

function nthWeekday(year: number, month: number, weekday: number, n: number): Date {
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + offset + (n - 1) * 7);
}

function plusDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function sundayBeforeChristmas(year: number, weeksBefore: number): Date {
  const christmas = new Date(year + 1, 0, 7);
  const lastSunday = plusDays(christmas, -((christmas.getDay() + 7) % 7 || 7));
  return plusDays(lastSunday, -7 * (weeksBefore - 1));
}

const blackFriday = (year: number) => plusDays(nthWeekday(year, 10, 4, 4), 1);

export const PROMO_PRESETS: PromoPreset[] = [
  {
    key: 'instagram',
    label: 'Instagram kod',
    name: 'Instagram popust',
    code: 'INSTA10',
    percent: 10,
    description: 'Popust uz kod sa našeg Instagrama.',
    oncePerClient: true,
    range: () => null,
  },
  {
    key: 'black-friday',
    label: 'Crni petak',
    name: 'Crni petak',
    code: 'CRNIPETAK',
    percent: 20,
    description: 'Crni petak — popust samo tog dana.',
    oncePerClient: true,
    range: (y) => [blackFriday(y), blackFriday(y)],
  },
  {
    key: 'cyber-monday',
    label: 'Sajber ponedeljak',
    name: 'Sajber ponedeljak',
    code: 'SAJBER',
    percent: 15,
    description: 'Popust za termine zakazane za sajber ponedeljak.',
    oncePerClient: true,
    range: (y) => [plusDays(blackFriday(y), 3), plusDays(blackFriday(y), 3)],
  },
  {
    key: 'valentine',
    label: 'Dan zaljubljenih',
    name: 'Dan zaljubljenih',
    code: 'LJUBAV',
    percent: 15,
    description: 'Nedelja ljubavi — doteraj se za 14. februar.',
    oncePerClient: true,
    range: (y) => [new Date(y, 1, 8), new Date(y, 1, 14)],
  },
  {
    key: 'womens-day',
    label: '8. mart',
    name: 'Dan žena',
    code: '8MART',
    percent: 20,
    description: 'Popust za Dan žena, od 1. do 8. marta.',
    oncePerClient: true,
    range: (y) => [new Date(y, 2, 1), new Date(y, 2, 8)],
  },
  {
    key: 'materice',
    label: 'Materice',
    name: 'Materice',
    code: 'MATERICE',
    percent: 15,
    description: 'Popust nedelju dana pred Materice.',
    oncePerClient: true,
    range: (y) => [plusDays(sundayBeforeChristmas(y, 2), -6), sundayBeforeChristmas(y, 2)],
  },
  {
    key: 'oci',
    label: 'Oci',
    name: 'Oci',
    code: 'OCI',
    percent: 15,
    description: 'Popust nedelju dana pred Oce.',
    oncePerClient: true,
    range: (y) => [plusDays(sundayBeforeChristmas(y, 1), -6), sundayBeforeChristmas(y, 1)],
  },
  {
    key: 'new-year',
    label: 'Novogodišnja',
    name: 'Novogodišnja akcija',
    code: 'NOVAGODINA',
    percent: 10,
    description: 'Spremi se za doček — praznični popust do kraja godine.',
    oncePerClient: false,
    range: (y) => [new Date(y, 11, 20), new Date(y, 11, 31)],
  },
];

export function nextPresetRange(preset: PromoPreset): [string, string] | null {
  const now = today();
  const year = Number(now.slice(0, 4));
  for (const y of [year, year + 1]) {
    const range = preset.range(y);
    if (!range) return null;
    const [from, to] = range.map(isoDate);
    if (to >= now) return [from < now ? now : from, to];
  }
  return null;
}
