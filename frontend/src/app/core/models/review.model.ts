export interface ReviewSummary {
  average: number | null;
  count: number;
  distribution: { rating: number; count: number }[];
}

export interface PublicReview {
  id: number;
  rating: number;
  comment: string | null;
  author: string;
  staff_name: string | null;
  services: string;
  reply: string | null;
  created_at: string;
}

export interface PublicReviews {
  enabled: boolean;
  summary: ReviewSummary;
  items: PublicReview[];
}

export interface Review {
  id: number;
  appointment_id: number;
  client_id: number;
  staff_member_id: number | null;
  rating: number;
  comment: string | null;
  visible: boolean;
  reply: string | null;
  replied_at: string | null;
  created_at: string;
  client?: { id: number; first_name: string; last_name: string; email: string | null; phone: string | null } | null;
  staff_member?: { id: number; first_name: string; last_name: string; color: string | null } | null;
  appointment?: { id: number; starts_at: string; items: { name: string }[] } | null;
}

export interface StaffRating extends ReviewSummary {
  id: number;
  name: string;
  color: string | null;
}

export interface AdminReviews {
  summary: ReviewSummary;
  staff: StaffRating[];
  items: Review[];
}

export interface ReviewFilters {
  rating?: number | null;
  staff_member_id?: number | null;
  visible?: boolean | null;
}

export function ratingLabel(value: number | null): string {
  return value === null ? '' : value.toLocaleString('sr-Latn-RS', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
