import { PaymentMethod } from './payment.model';

export type WalletKind = 'deposit' | 'gift_card' | 'payment' | 'refund' | 'adjustment';

export const WALLET_KIND_LABELS: Record<WalletKind, string> = {
  deposit: 'Uplata unapred',
  gift_card: 'Poklon kartica',
  payment: 'Plaćen termin',
  refund: 'Vraćeno na stanje',
  adjustment: 'Ispravka',
};

export interface WalletEntry {
  id: number;
  amount: number;
  kind: WalletKind;
  payment_method: PaymentMethod | null;
  note: string | null;
  created_at: string;
  author: { id: number; first_name: string; last_name: string } | null;
  appointment: { id: number; starts_at: string } | null;
}

export interface OwnedGiftCard {
  id: number;
  code: string;
  kind: GiftCardKind;
  amount: number;
  balance: number;
  buyer_name: string | null;
  note: string | null;
  expires_on: string | null;
  status: GiftCardStatus;
}

export interface Wallet {
  balance: number;
  gift_cards: OwnedGiftCard[];
  entries: WalletEntry[];
}

export type GiftCardKind = 'digital' | 'physical';

export type GiftCardStatus = 'active' | 'used' | 'expired' | 'cancelled';

export const GIFT_CARD_STATUS: Record<GiftCardStatus, { label: string; badge: string }> = {
  active: { label: 'Aktivna', badge: 'badge-success' },
  used: { label: 'Potrošena', badge: 'badge-neutral' },
  expired: { label: 'Istekla', badge: 'badge-warning' },
  cancelled: { label: 'Poništena', badge: 'badge-danger' },
};

export interface GiftCard {
  id: number;
  code: string;
  kind: GiftCardKind;
  card_number: string | null;
  amount: number;
  balance: number;
  buyer_name: string | null;
  recipient_name: string | null;
  note: string | null;
  payment_method: PaymentMethod;
  expires_on: string | null;
  status: GiftCardStatus;
  created_at: string;
  seller: { id: number; first_name: string; last_name: string } | null;
  owner: { id: number; first_name: string; last_name: string; nickname?: string | null } | null;
}

export interface GiftCardCheck extends GiftCard {
  uses: { id: number; amount: number; created_at: string; appointment: { id: number; starts_at: string } | null }[];
}

export interface GiftCardPayload {
  kind: GiftCardKind;
  owner_id: number | null;
  card_number: string | null;
  amount: number;
  payment_method: PaymentMethod;
  buyer_name: string | null;
  recipient_name: string | null;
  note: string | null;
  expires_on: string | null;
}

export function formatGiftCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}
