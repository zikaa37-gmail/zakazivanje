import { BusinessCategory } from '../models/business-setting.model';

export interface StaffTerm {
  term: string;
  genitive: string;
}

export const STAFF_TERMS: Record<BusinessCategory, StaffTerm[]> = {
  hair_salon: [
    { term: 'frizer', genitive: 'frizera' },
    { term: 'stilista', genitive: 'stiliste' },
  ],
  barber: [
    { term: 'berberin', genitive: 'berberina' },
    { term: 'frizer', genitive: 'frizera' },
  ],
  beauty_salon: [
    { term: 'kozmetičar', genitive: 'kozmetičara' },
    { term: 'terapeut', genitive: 'terapeuta' },
  ],
  spa: [
    { term: 'terapeut', genitive: 'terapeuta' },
    { term: 'maser', genitive: 'masera' },
  ],
  nail_salon: [
    { term: 'manikir', genitive: 'manikira' },
    { term: 'nail tehničar', genitive: 'nail tehničara' },
  ],
  massage: [
    { term: 'maser', genitive: 'masera' },
    { term: 'terapeut', genitive: 'terapeuta' },
  ],
  tattoo: [
    { term: 'tatu majstor', genitive: 'tatu majstora' },
    { term: 'umetnik', genitive: 'umetnika' },
  ],
  dental: [
    { term: 'stomatolog', genitive: 'stomatologa' },
    { term: 'doktor', genitive: 'doktora' },
  ],
  fitness: [
    { term: 'trener', genitive: 'trenera' },
    { term: 'instruktor', genitive: 'instruktora' },
  ],
  personal_trainer: [
    { term: 'trener', genitive: 'trenera' },
    { term: 'instruktor', genitive: 'instruktora' },
  ],
  medical: [
    { term: 'doktor', genitive: 'doktora' },
    { term: 'lekar', genitive: 'lekara' },
    { term: 'terapeut', genitive: 'terapeuta' },
  ],
  other: [
    { term: 'radnik', genitive: 'radnika' },
    { term: 'stručnjak', genitive: 'stručnjaka' },
  ],
};
