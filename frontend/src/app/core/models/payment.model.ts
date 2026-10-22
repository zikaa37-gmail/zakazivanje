export type PaymentMethod = 'cash' | 'card' | 'bank';

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Gotovina' },
  { value: 'card', label: 'Kartica' },
  { value: 'bank', label: 'Uplata na račun' },
];

export interface PaymentDetails {
  appointment_id: number;
  starts_at: string;
  services: string;
  payer: string;
  amount: number;
  account: string;
  payee: string;
  payment_code: string;
  purpose: string;
  model: string;
  reference: string;
  payload: string;
  qr: string;
}
