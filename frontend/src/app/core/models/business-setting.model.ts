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
  pib: string | null;
  registration_number: string | null;
  logo: string | null;
}

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
