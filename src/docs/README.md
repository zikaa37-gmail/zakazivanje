# Frontend Features

Ovde će biti organizovani svi feature moduli aplikacije.

## Struktura

```
features/
├── home/           # Landing page
├── auth/           # Autentifikacija (login, register)
├── search/         # Pretraga biznisa
├── appointments/   # Zakazivanje i upravljanje terminima
├── profile/        # Korisnički profil
├── business/       # Biznis profil i upravljanje
└── reviews/        # Recenzije i ocene
```

Svaki feature treba da sadrži:

- `*.component.ts` - Komponenta
- `*.service.ts` - Servis za API komunikaciju
- `*.routes.ts` - Rute (za lazy loading)
- `*.models.ts` - Modeli specifični za feature

## Princip

Svaka komponenta je **standalone**, koristi **signale** za state management i **reaktivne forme** za input.
