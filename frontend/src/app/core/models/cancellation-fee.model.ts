import { PaymentMethod } from './payment.model';

export type CancellationFeeType = 'fixed' | 'percent' | 'service_plus_fixed';
export type ServiceCancellationFeeType = CancellationFeeType | 'none';
export type CancellationDiscountType = 'fixed' | 'percent' | 'exempt';
export type CancellationFeeStatus = 'free' | 'open' | 'paid' | 'waived';

export const CANCELLATION_FEE_TYPES: { value: CancellationFeeType; label: string; hint: string }[] = [
  { value: 'percent', label: 'Procenat cene usluge', hint: 'npr. 50% cene' },
  { value: 'fixed', label: 'Fiksni iznos', hint: 'isti iznos bez obzira na cenu' },
  { value: 'service_plus_fixed', label: 'Cela usluga + naknada', hint: 'puna cena usluge i dodatni iznos' },
];

export const CANCELLATION_DISCOUNT_TYPES: { value: CancellationDiscountType; label: string }[] = [
  { value: 'percent', label: 'Umanjenje u %' },
  { value: 'fixed', label: 'Umanjenje u dinarima' },
  { value: 'exempt', label: 'Oslobođen naknade' },
];

export const CANCELLATION_FEE_STATUS: Record<CancellationFeeStatus, { label: string; badge: string }> = {
  free: { label: 'Bez naplate', badge: '' },
  open: { label: 'Za naplatu', badge: 'badge-warning' },
  paid: { label: 'Naplaćeno', badge: 'badge-success' },
  waived: { label: 'Oprošteno', badge: '' },
};

export interface CancellationFee {
  id: number;
  appointment_id: number;
  client_id: number;
  late_number: number;
  base_amount: number;
  amount: number;
  status: CancellationFeeStatus;
  reason: string | null;
  paid_at: string | null;
  payment_method: PaymentMethod | null;
  created_at: string;
  appointment?: { id: number; starts_at: string; items?: { name: string }[] };
  client?: { id: number; first_name: string; last_name: string; phone: string | null };
  decider?: { id: number; first_name: string; last_name: string } | null;
}

export interface CancellationPreview {
  late: boolean;
  free?: boolean;
  number?: number;
  free_total?: number;
  free_left_after?: number | null;
  next_amount?: number | null;
  amount?: number;
  note?: string;
  deadline_label?: string;
}

export interface CancellationStatus {
  enabled: boolean;
  free_total: number;
  used: number;
  free_left: number;
  window_days: number;
  exempt: boolean;
  open_amount: number;
  note: string;
}
