import { CommunicationChannel, Gender } from './user.model';

export type DisciplineZone = 'green' | 'yellow' | 'orange' | 'red';

export const ZONES: { value: DisciplineZone; label: string; badge: string; hint: string }[] = [
  { value: 'green', label: 'Zelena', badge: 'badge-success', hint: 'Zakazuje bez ograničenja.' },
  { value: 'yellow', label: 'Žuta', badge: 'badge-warning', hint: 'Otežano: kasniji i kraći period za zakazivanje, svaki termin čeka potvrdu.' },
  { value: 'orange', label: 'Narandžasta', badge: 'badge-danger', hint: 'Tiho blokiran: klijent vidi da su svi termini popunjeni.' },
  { value: 'red', label: 'Crvena', badge: 'badge-danger', hint: 'Suspendovan: posle prijave vidi da ne može da koristi usluge salona.' },
];

export const ZONE_BY_VALUE = Object.fromEntries(ZONES.map((z) => [z.value, z])) as Record<DisciplineZone, (typeof ZONES)[number]>;

export interface ClientActivity {
  id: number;
  type: string;
  data: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  actor: { id: number; first_name: string; last_name: string } | null;
}

export interface ClientStats {
  total: number;
  completed: number;
  upcoming: number;
  cancelled_by_client: number;
  late_cancelled: number;
  cancelled_by_salon: number;
  no_shows: number;
  reliability: number | null;
}

export interface ClientHistory {
  client: Client;
  stats: ClientStats;
  logs: ClientActivity[];
  has_more: boolean;
}

export interface ZonePayload {
  zone: DisciplineZone | null;
  reason: string | null;
  until: string | null;
}

export interface Client {
  id: number;
  first_name: string;
  last_name: string;
  gender: Gender | null;
  favorite_staff_member_id: number | null;
  email: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  preferred_communication: CommunicationChannel;
  note: string | null;
  active: boolean;
  has_account: boolean;
  created_at: string;
  last_login_at: string | null;
  discipline_zone: DisciplineZone;
  discipline_points: number;
  zone_manual: boolean;
  zone_until: string | null;
  zone_reason: string | null;
  zone_changed_at: string | null;
}

export interface ClientPayload {
  first_name: string;
  last_name: string;
  gender: Gender | null;
  favorite_staff_member_id: number | null;
  email: string | null;
  phone: string;
  whatsapp_number: string | null;
  preferred_communication: CommunicationChannel;
  note: string | null;
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}
