import { UserRole } from './user.model';

export type StaffRole = Exclude<UserRole, 'client'>;

export interface TeamMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: StaffRole;
  active: boolean;
  staff_member_id: number | null;
  staff_member: { id: number; first_name: string; last_name: string; title: string | null; color: string | null; active: boolean } | null;
  has_password: boolean;
  last_login_at: string | null;
}

export interface TeamMemberPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: StaffRole;
  active?: boolean;
  send_invite?: boolean;
}

export const STAFF_ROLE_OPTIONS: { value: StaffRole; label: string; hint: string }[] = [
  { value: 'manager', label: 'Administrativni radnik', hint: 'Vodi salon umesto vlasnika: termini, klijenti, zaposleni, usluge, cene, recenzije, galerija, podešavanja; izveštaje šalje vlasniku. Ne vidi finansijsku statistiku i ne menja naloge vlasnika.' },
  { value: 'owner', label: 'Vlasnik', hint: 'Sve, uključujući finansijsku statistiku i naloge vlasnika.' },
  { value: 'worker', label: 'Radnik', hint: 'Samo svoj dan: kalendar, termini, klijenti, svoj pazar i bakšiš. Samo za nalog vezan za zaposlenog.' },
];
