export type PromotionType = 'discount_percent' | 'discount_amount' | 'bundle' | 'package' | 'loyalty';

export interface Promotion {
  id: number;
  name: string;
  type: PromotionType;
  description: string | null;
  discount_percent: number | null;
  discount_amount: number | null;
  package_price: number | null;
  buy_quantity: number | null;
  free_quantity: number | null;
  loyalty_visits: number | null;
  starts_on: string | null;
  ends_on: string | null;
  weekdays: number[] | null;
  active: boolean;
  services: { id: number; name: string; price: number }[];
}

export type PromotionPayload = Omit<Promotion, 'id' | 'services'> & { service_ids: number[] };

export const PROMOTION_TYPES: { value: PromotionType; label: string; hint: string }[] = [
  { value: 'discount_percent', label: 'Popust u %', hint: 'Procenat popusta na izabrane usluge (ili sve).' },
  { value: 'discount_amount', label: 'Popust u dinarima', hint: 'Fiksan iznos manje na izabrane usluge (ili sve).' },
  { value: 'package', label: 'Paket', hint: 'Više usluga zajedno po paket-ceni.' },
  { value: 'bundle', label: 'N + M gratis', hint: 'Npr. 2+1: svaka treća ista usluga je besplatna.' },
  { value: 'loyalty', label: 'Loyalty', hint: 'Nagrada za svaku N-tu posetu (procenat popusta, 100 = gratis).' },
];
