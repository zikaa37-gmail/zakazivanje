export type UserRole = 'client' | 'owner' | 'manager' | 'worker';

export type CommunicationChannel = 'email' | 'whatsapp' | 'both';

export type Gender = 'female' | 'male';

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'female', label: 'Žene' },
  { value: 'male', label: 'Muškarce' },
];

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  gender: Gender | null;
  favorite_staff_member_id: number | null;
  staff_member_id: number | null;
  email: string;
  phone: string | null;
  whatsapp_number: string | null;
  role: UserRole;
  suspended: boolean;
  preferred_communication: CommunicationChannel;
  active: boolean;
  email_verified_at: string | null;
  last_login_at: string | null;
  created_at: string;
}

export const COMMUNICATION_OPTIONS: { value: CommunicationChannel; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'both', label: 'Email i WhatsApp' },
];

export const ROLE_LABELS: Record<UserRole, string> = {
  client: 'Klijent',
  owner: 'Vlasnik',
  manager: 'Administrativni radnik',
  worker: 'Radnik',
};

export function userRoleLabel(user: Pick<User, 'role' | 'staff_member_id'>): string {
  return user.role !== 'worker' && user.role !== 'client' && user.staff_member_id !== null ? `${ROLE_LABELS[user.role]} · radi usluge` : ROLE_LABELS[user.role];
}
