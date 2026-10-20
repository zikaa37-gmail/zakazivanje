export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface AppointmentItem {
  id: number;
  service_id: number | null;
  name: string;
  duration_minutes: number;
  price: number;
  discount: number;
  promotion_name: string | null;
}

export interface Appointment {
  id: number;
  client_id: number;
  staff_member_id: number;
  recurrence_id: number | null;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  source: 'online' | 'admin' | 'recurring';
  price: number;
  discount: number;
  total: number;
  note: string | null;
  admin_note: string | null;
  items: AppointmentItem[];
  staff_member?: { id: number; first_name: string; last_name: string; title?: string | null; color: string | null };
  client?: { id: number; first_name: string; last_name: string; phone: string | null; email: string | null };
  recurrence?: { id: number; interval_weeks: number; active: boolean } | null;
  can_cancel?: boolean;
}

export interface Slot {
  time: string;
  staff_member_ids: number[];
}

export interface DayAvailability {
  date: string;
  available: boolean;
}

export interface Quote {
  packages: { promotion_id: number; name: string; service_ids: number[]; price: number; discount: number; total: number }[];
  lines: { service_id: number; name: string; price: number; discount: number; total: number; promotion_name: string | null }[];
  subtotal: number;
  discount: number;
  total: number;
}

export interface GuestDetails {
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
}

export interface BookingPayload {
  service_ids: number[];
  staff_member_id: number | null;
  starts_at: string;
  note: string | null;
  guest?: GuestDetails;
}

export interface AdminAppointmentPayload {
  client_id: number;
  service_ids: number[];
  staff_member_id: number;
  starts_at: string;
  note: string | null;
  admin_note: string | null;
  recurrence: { interval_weeks: number; count: number | null; ends_on: string | null } | null;
}

export interface Recurrence {
  id: number;
  weekday: number;
  start_time: string;
  interval_weeks: number;
  starts_on: string;
  ends_on: string | null;
  skipped_dates: string[] | null;
  client: { id: number; first_name: string; last_name: string; phone: string | null };
  staff_member: { id: number; first_name: string; last_name: string; color: string | null };
}

export const STATUS_LABELS: Record<AppointmentStatus, { label: string; badge: string }> = {
  pending: { label: 'Na čekanju', badge: 'badge-warning' },
  confirmed: { label: 'Potvrđen', badge: 'badge-success' },
  completed: { label: 'Završen', badge: 'badge-neutral' },
  cancelled: { label: 'Otkazan', badge: 'badge-danger' },
  no_show: { label: 'Nije došao', badge: 'badge-danger' },
};
