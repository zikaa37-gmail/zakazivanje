import { CommunicationChannel } from './user.model';

export interface Client {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  preferred_communication: CommunicationChannel;
  note: string | null;
  active: boolean;
  has_account: boolean;
  created_at: string;
}

export interface ClientPayload {
  first_name: string;
  last_name: string;
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
