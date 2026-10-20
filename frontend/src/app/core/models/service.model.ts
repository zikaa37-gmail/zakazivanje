export interface SalonService {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  duration_minutes: number;
  price: number;
  active: boolean;
  sort_order: number;
  staff_members: { id: number; first_name: string; last_name: string }[];
}

export interface SalonServicePayload {
  name: string;
  description: string | null;
  category: string | null;
  duration_minutes: number;
  price: number;
  active: boolean;
  staff_member_ids: number[];
}

export const DURATION_OPTIONS = [15, 20, 30, 45, 60, 75, 90, 105, 120, 150, 180, 240];
