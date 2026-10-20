# Figma nacrti — Zakazivanje

Predlog ekrana iz [`docs/stranice.md`](../stranice.md) kao SVG frejmovi sa izmenjivim tekstom i
oblicima. Tokeni su iz `frontend/src/themes/colors.scss` (primarna teal `#0f766e`).

## Uvoz u Figmu

1. Napravi Figma fajl „Zakazivanje" sa stranicama `Mobilni`, `Auth`, `Admin`, `Komponente`.
2. Prevuci SVG fajlove iz odgovarajućeg foldera na canvas. Svaki fajl postaje jedan frejm.

## Sadržaj

| Folder | Format | Ekrani |
| --- | --- | --- |
| `mobilni/` | 390×844 | početna, zakazivanje u 4 koraka, zakazano, moji termini, profil, admin „Danas" i meni na telefonu |
| `auth/` | 390×844 | prijava, registracija, zaboravljena lozinka, nova lozinka |
| `admin/` | 1440×900 | danas, kalendar (dan, po zaposlenom), termini (sa menijem akcija), usluge + modal, zaposleni, klijenti, podešavanja |
| `components/` | 1440×900 | boje, tipografija, dugmad, polja, statusi termina, izbor termina, poruke |

## Pretpostavke u nacrtima (otvorena pitanja iz `stranice.md`)

- Gost može da zakaže bez naloga (ime + telefon) — korak 4 ima izbor „Imam nalog / Nastavi kao gost".
- Termin je „Na čekanju" dok ga admin ne potvrdi (dugme „Potvrdi" na ekranu Danas).
- Zaposleni nemaju svoj nalog — samo admin.

## Regenerisanje

```bash
node docs/figma/generate.mjs
```

Posle izmene ekrana ažuriraj skriptu i pokreni je ponovo.
