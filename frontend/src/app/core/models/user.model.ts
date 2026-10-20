export type UserRole = 'client' | 'admin';

export type CommunicationChannel = 'email' | 'whatsapp' | 'both';

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  whatsapp_number: string | null;
  role: UserRole;
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
  admin: 'Administrator',
};
