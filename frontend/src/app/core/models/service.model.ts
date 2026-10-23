import { Gender } from './user.model';

export type ServiceAudience = 'all' | Gender;

export const AUDIENCE_OPTIONS: { value: ServiceAudience; label: string; short: string }[] = [
  { value: 'all', label: 'Svi', short: '' },
  { value: 'female', label: 'Žene', short: 'Za žene' },
  { value: 'male', label: 'Muškarci', short: 'Za muškarce' },
];

export function suitsAudience(audience: ServiceAudience, gender: Gender | null): boolean {
  return audience === 'all' || gender === null || audience === gender;
}

export const OTHER_CATEGORY = 'Ostalo';

export function categoryOf(service: { category: string | null }): string {
  return service.category?.trim() || OTHER_CATEGORY;
}

export function categoriesOf(services: { category: string | null }[]): string[] {
  const names = [...new Set(services.map(categoryOf))];
  return names.includes(OTHER_CATEGORY) ? [...names.filter((n) => n !== OTHER_CATEGORY), OTHER_CATEGORY] : names;
}

export function groupByCategory<T extends { category: string | null }>(services: T[]): { category: string; items: T[] }[] {
  return categoriesOf(services).map((category) => ({ category, items: services.filter((s) => categoryOf(s) === category) }));
}

export function audienceLabel(audience: ServiceAudience): string {
  return AUDIENCE_OPTIONS.find((o) => o.value === audience)?.short ?? '';
}

export interface SalonService {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  audience: ServiceAudience;
  duration_minutes: number;
  price: number;
  active: boolean;
  sort_order: number;
  staff_members: { id: number; first_name: string; last_name: string }[];
}

export interface SalonServicePayload {
  name: string;
  description: string | null;
  category: string | null;
  audience: ServiceAudience;
  duration_minutes: number;
  price: number;
  active: boolean;
  staff_member_ids: number[];
}

export const DURATION_OPTIONS = [15, 20, 30, 45, 60, 75, 90, 105, 120, 150, 180, 240];

export interface PublicService {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  audience: ServiceAudience;
  duration_minutes: number;
  price: number;
  staff_members: { id: number; first_name: string; last_name: string; title: string | null }[];
}
