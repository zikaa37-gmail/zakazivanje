import { Appointment } from './appointment.model';

export type AbsenceType = 'sick' | 'vacation' | 'other';
export type AbsenceStatus = 'pending' | 'approved' | 'rejected';

export const ABSENCE_TYPES: { value: AbsenceType; label: string }[] = [
  { value: 'sick', label: 'Bolovanje' },
  { value: 'vacation', label: 'Odmor' },
  { value: 'other', label: 'Drugo' },
];

export const ABSENCE_STATUS: Record<AbsenceStatus, { label: string; badge: string }> = {
  pending: { label: 'Čeka odobrenje', badge: 'badge-warning' },
  approved: { label: 'Odobreno', badge: 'badge-success' },
  rejected: { label: 'Odbijeno', badge: 'badge-neutral' },
};

interface PersonRef {
  id: number;
  first_name: string;
  last_name: string;
}

export interface StaffAbsence {
  id: number;
  staff_member_id: number;
  starts_on: string;
  ends_on: string;
  type: AbsenceType;
  note: string | null;
  status: AbsenceStatus;
  requested_by: number | null;
  decided_at: string | null;
  staff_member: PersonRef & { color: string | null };
  requester: PersonRef | null;
  decider: PersonRef | null;
}

export interface StaffAbsencePayload {
  staff_member_id: number;
  starts_on: string;
  ends_on: string;
  type: AbsenceType;
  note: string | null;
}

export type ColleagueRef = PersonRef & { color: string | null };

export type AffectedAppointment = Appointment & { alternatives: ColleagueRef[] };
