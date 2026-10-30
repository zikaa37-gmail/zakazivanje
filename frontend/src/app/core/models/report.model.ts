import { AppointmentStatus } from './appointment.model';

export type ReportPeriod = 'day' | 'week' | 'month';

export type ReportChannel = 'mail' | 'whatsapp';

export interface ReportQuery {
  period: ReportPeriod;
  date: string;
  staff_member_id: number | null;
}

export interface ReportTotals {
  appointments: number;
  completed: number;
  upcoming: number;
  cancelled: number;
  cancelled_by_client: number;
  no_shows: number;
  revenue: number;
  discount: number;
  paid: number;
  unpaid: number;
  by_method: { cash: number; card: number; bank: number };
  tips: number;
  average_ticket: number;
  booked_minutes: number;
  available_minutes: number;
  utilization: number;
  clients: number;
  new_clients: number;
  rating: number | null;
  reviews: number;
}

export interface Report {
  title: string;
  business: string;
  staff_member: { id: number; name: string; active: boolean } | null;
  period: { type: ReportPeriod; from: string; to: string; label: string };
  totals: ReportTotals;
  staff: (ReportTotals & { id: number; name: string; active: boolean })[];
  days: { date: string; label: string; appointments: number; completed: number; cancelled: number; revenue: number }[];
  services: { name: string; count: number; revenue: number }[];
  appointments: {
    id: number;
    date: string;
    time: string;
    client: string;
    staff: string;
    services: string;
    status: AppointmentStatus;
    status_label: string;
    total: number;
    paid: boolean;
  }[];
  generated_at: string;
}

export const REPORT_PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: 'day', label: 'Dan' },
  { value: 'week', label: 'Nedelja' },
  { value: 'month', label: 'Mesec' },
];
