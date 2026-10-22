export type BusinessCategory =
  | 'hair_salon'
  | 'barber'
  | 'beauty_salon'
  | 'spa'
  | 'nail_salon'
  | 'massage'
  | 'tattoo'
  | 'dental'
  | 'fitness'
  | 'personal_trainer'
  | 'medical'
  | 'other';

export type ConfirmationMode = 'manual' | 'automatic';

export interface OpeningHour {
  weekday: number;
  opens_at: string | null;
  closes_at: string | null;
}

export interface ShiftTemplate {
  id?: number;
  name: string;
  starts_at: string;
  ends_at: string;
}

export interface BusinessSetting {
  id: number;
  name: string;
  category: BusinessCategory;
  description: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  youtube: string | null;
  pib: string | null;
  registration_number: string | null;
  logo: string | null;
  cover_url: string | null;
  cover_image?: string | null;
  theme_primary: string | null;
  theme_secondary: string | null;
  theme_tertiary: string | null;
  booking_confirmation: ConfirmationMode;
  slot_interval_minutes: number;
  booking_lead_minutes: number;
  booking_horizon_days: number;
  booking_min_days_ahead: number;
  cancellation_days_before: number;
  allow_guest_booking: boolean;
  notify_booking_received: boolean;
  notify_booking_confirmed: boolean;
  notify_booking_cancelled: boolean;
  reminder_hours: number;
  notify_admin_new_booking: boolean;
  bank_account: string | null;
  payee_name: string | null;
  payee_address: string | null;
  payment_code: string;
  online_payment_enabled: boolean;
  reviews_enabled: boolean;
  notify_review_request: boolean;
  opening_hours?: OpeningHour[];
  shifts?: ShiftTemplate[];
}

export const CONFIRMATION_OPTIONS: { value: ConfirmationMode; label: string; hint: string }[] = [
  { value: 'manual', label: 'Ručno', hint: 'Termin čeka da ga admin potvrdi.' },
  { value: 'automatic', label: 'Automatski', hint: 'Termin je potvrđen odmah po zakazivanju.' },
];

export const BUSINESS_CATEGORIES: { value: BusinessCategory; label: string }[] = [
  { value: 'hair_salon', label: 'Frizerski salon' },
  { value: 'barber', label: 'Berberin' },
  { value: 'beauty_salon', label: 'Kozmetički salon' },
  { value: 'spa', label: 'Spa i wellness' },
  { value: 'nail_salon', label: 'Salon za nokte' },
  { value: 'massage', label: 'Masaža' },
  { value: 'tattoo', label: 'Tetoviranje' },
  { value: 'dental', label: 'Stomatologija' },
  { value: 'fitness', label: 'Fitnes centar' },
  { value: 'personal_trainer', label: 'Lični trener' },
  { value: 'medical', label: 'Medicinska ordinacija' },
  { value: 'other', label: 'Ostalo' },
];
