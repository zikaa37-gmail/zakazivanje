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
  { value: 'worker', label: 'Radnik', hint: 'Kalendar, termini, klijenti i lista čekanja.' },
  { value: 'owner', label: 'Vlasnik', hint: 'Sve, uključujući podešavanja, cene, zaposlene i statistiku.' },
];
