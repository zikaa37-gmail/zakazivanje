import { ConfirmationMode } from './business-setting.model';

export interface WorkingHour {
  weekday: number;
  starts_at: string;
  ends_at: string;
}

export interface StaffMember {
  id: number;
  first_name: string;
  last_name: string;
  title: string | null;
  phone: string | null;
  email: string | null;
  color: string | null;
  booking_confirmation: ConfirmationMode | null;
  avatar: string | null;
  active: boolean;
  sort_order: number;
  working_hours: WorkingHour[];
  services: { id: number; name: string }[];
}

export interface StaffMemberPayload {
  first_name: string;
  last_name: string;
  title: string | null;
  phone: string | null;
  email: string | null;
  color: string | null;
  booking_confirmation: ConfirmationMode | null;
  active: boolean;
  service_ids: number[];
  working_hours: WorkingHour[];
}

export const WEEKDAYS: { value: number; short: string; label: string }[] = [
  { value: 1, short: 'P', label: 'Ponedeljak' },
  { value: 2, short: 'U', label: 'Utorak' },
  { value: 3, short: 'S', label: 'Sreda' },
  { value: 4, short: 'Č', label: 'Četvrtak' },
  { value: 5, short: 'P', label: 'Petak' },
  { value: 6, short: 'S', label: 'Subota' },
  { value: 7, short: 'N', label: 'Nedelja' },
];
