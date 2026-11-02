import { BusinessCategory } from '../models/business-setting.model';
import { CategoryProposal, ServiceAudience } from '../models/service.model';

type Row = [name: string, minutes: number, audience?: ServiceAudience];

function category(name: string, rows: Row[]): CategoryProposal {
  return { name, services: rows.map(([service, minutes, audience]) => ({ name: service, duration_minutes: minutes, price: null, audience: audience ?? 'all' })) };
}

const NAILS = category('Nokti', [
  ['Manikir', 45],
  ['Gel lak', 60],
  ['Izlivanje noktiju', 120, 'female'],
  ['Korekcija noktiju', 90, 'female'],
  ['Pedikir', 60],
]);

const MASSAGE = category('Masaža', [
  ['Relaks masaža 30 min', 30],
  ['Relaks masaža 60 min', 60],
  ['Sportska masaža', 60],
  ['Anticelulit masaža', 45, 'female'],
]);

export const SERVICE_PRESETS: Record<BusinessCategory, CategoryProposal[]> = {
  hair_salon: [
    category('Šišanje', [
      ['Žensko šišanje', 45, 'female'],
      ['Muško šišanje', 30, 'male'],
      ['Dečje šišanje', 30],
    ]),
    category('Feniranje i stilizovanje', [
      ['Feniranje', 30],
      ['Svečana frizura', 60, 'female'],
      ['Pletenice', 45, 'female'],
    ]),
    category('Boja', [
      ['Farbanje izrastka', 90, 'female'],
      ['Farbanje cele dužine', 120, 'female'],
      ['Pramenovi', 150, 'female'],
      ['Balayage', 180, 'female'],
    ]),
    category('Nega kose', [
      ['Tretman nege kose', 30],
      ['Keratinsko ispravljanje', 150, 'female'],
    ]),
  ],
  barber: [
    category('Šišanje', [
      ['Muško šišanje', 30, 'male'],
      ['Šišanje mašinicom', 20, 'male'],
      ['Dečje šišanje', 20],
    ]),
    category('Brada', [
      ['Oblikovanje brade', 20, 'male'],
      ['Brijanje britvom', 30, 'male'],
      ['Šišanje i brada', 45, 'male'],
    ]),
  ],
  beauty_salon: [
    category('Tretmani lica', [
      ['Klasično čišćenje lica', 60],
      ['Hidratantni tretman lica', 60],
      ['Hemijski piling', 45],
      ['Dermapen', 60],
    ]),
    category('Depilacija', [
      ['Depilacija nogu', 45, 'female'],
      ['Depilacija prepona', 30, 'female'],
      ['Depilacija pazuha', 15],
      ['Depilacija nausnica', 10, 'female'],
    ]),
    category('Trepavice i obrve', [
      ['Oblikovanje obrva', 20],
      ['Farbanje obrva', 20],
      ['Laminacija trepavica', 60, 'female'],
      ['Nadogradnja trepavica', 120, 'female'],
    ]),
    NAILS,
    MASSAGE,
  ],
  spa: [
    MASSAGE,
    category('Tretmani tela', [
      ['Piling tela', 45],
      ['Oblog tela', 60],
    ]),
    category('Wellness', [
      ['Sauna', 60],
      ['Spa paket', 120],
    ]),
  ],
  nail_salon: [
    NAILS,
    category('Nail art', [
      ['Ukrasi po noktu', 10],
      ['French', 30],
    ]),
    category('Skidanje', [
      ['Skidanje gela', 30],
      ['Skidanje gel laka', 20],
    ]),
  ],
  massage: [
    MASSAGE,
    category('Terapeutska masaža', [
      ['Masaža leđa', 30],
      ['Medicinska masaža', 60],
      ['Limfna drenaža', 60],
    ]),
  ],
  tattoo: [
    category('Tetovaže', [
      ['Konsultacija', 30],
      ['Mala tetovaža', 60],
      ['Srednja tetovaža', 180],
      ['Seansa (pun dan)', 360],
    ]),
    category('Pirsing', [
      ['Pirsing uva', 20],
      ['Pirsing nosa', 20],
    ]),
  ],
  dental: [
    category('Pregledi', [
      ['Stomatološki pregled', 30],
      ['Kontrolni pregled', 20],
    ]),
    category('Lečenje', [
      ['Plomba', 45],
      ['Lečenje kanala', 60],
      ['Vađenje zuba', 30],
    ]),
    category('Higijena i estetika', [
      ['Uklanjanje kamenca', 45],
      ['Izbeljivanje zuba', 60],
    ]),
  ],
  fitness: [
    category('Treninzi', [
      ['Personalni trening', 60],
      ['Grupni trening', 60],
      ['Probni trening', 45],
    ]),
    category('Konsultacije', [
      ['Merenje i procena', 30],
      ['Plan ishrane', 45],
    ]),
  ],
  personal_trainer: [
    category('Treninzi', [
      ['Personalni trening', 60],
      ['Trening u paru', 60],
      ['Online trening', 45],
    ]),
    category('Konsultacije', [
      ['Merenje i procena', 30],
      ['Plan ishrane', 45],
    ]),
  ],
  medical: [
    category('Pregledi', [
      ['Specijalistički pregled', 30],
      ['Kontrolni pregled', 20],
      ['Konsultacija', 20],
    ]),
    category('Dijagnostika', [
      ['Ultrazvuk', 30],
      ['EKG', 15],
    ]),
  ],
  other: [
    category('Usluge', [
      ['Konsultacija', 30],
      ['Standardna usluga', 60],
    ]),
  ],
};
