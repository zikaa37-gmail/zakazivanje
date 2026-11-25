import { Role, UserRole } from './user.model';

export const STAFF_ROLE_OPTIONS: { value: UserRole; label: string; hint: string }[] = [
  { value: Role.Manager, label: 'Menadžer', hint: 'Vodi salon umesto vlasnika: termini, klijenti, zaposleni, usluge, cene, recenzije, galerija, podešavanja; izveštaje šalje vlasniku. Ne vidi finansijsku statistiku i ne menja naloge vlasnika.' },
  { value: Role.Owner, label: 'Vlasnik', hint: 'Sve, uključujući finansijsku statistiku i naloge vlasnika.' },
  { value: Role.Worker, label: 'Radnik', hint: 'Samo svoj dan: kalendar, termini, klijenti, svoj pazar i bakšiš.' },
];
