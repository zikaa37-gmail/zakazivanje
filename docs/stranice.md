# Predlog frontend stranica

Mobile-first, isti vizuelni sistem kao `kosarkaska-evidencija` (Tailwind tokeni, `.card`, `appBtn`,
`<app-modal>`), primarna boja teal. Status: **čeka potvrdu**. Nacrti: [`docs/figma/`](figma/README.md).

## Javno (bez prijave)

| # | Ruta | Stranica | Sadržaj |
| --- | --- | --- | --- |
| 1 | `/` | Početna | logo i naziv biznisa, dugme „Zakaži termin", usluge sa cenom i trajanjem, radno vreme, adresa / telefon / Instagram |
| 2 | `/book` | Zakazivanje (4 koraka) | 1) usluga → 2) zaposleni ili „bilo ko" → 3) dan + slobodni termini → 4) potvrda (prijava / registracija ako korisnik nije prijavljen) |
| 3 | `/login` | Prijava | email, lozinka, linkovi ka registraciji i zaboravljenoj lozinci |
| 4 | `/register` | Registracija | ime, prezime, email, telefon, WhatsApp, kanal obaveštenja, lozinka |
| 5 | `/verify-email` | Potvrda mejla | token iz linka → poruka o uspehu / ponovno slanje |
| 6 | `/forgot-password` | Zaboravljena lozinka | email → poruka |
| 7 | `/reset-password` | Nova lozinka | lozinka + potvrda (token i email iz linka) |

## Klijent

| # | Ruta | Stranica | Sadržaj |
| --- | --- | --- | --- |
| 8 | `/my-appointments` | Moji termini | tabovi Predstojeći / Prošli, kartica termina (usluga, zaposleni, datum, vreme, cena), otkazivanje kroz confirm |
| 9 | `/profile` | Profil | lični podaci, kanal obaveštenja, promena lozinke, odjava |

## Admin

| # | Ruta | Stranica | Sadržaj |
| --- | --- | --- | --- |
| 10 | `/admin` | Danas | današnji termini po satu, sledeći klijent, brzo „+ Termin" |
| 11 | `/admin/calendar` | Kalendar | dan / nedelja, kolona po zaposlenom, klik na prazno = novi termin (telefonom), blokiranje vremena |
| 12 | `/admin/appointments` | Termini | lista sa filterima (period, zaposleni, status), akcije: potvrdi, otkaži, završeno, nije došao |
| 13 | `/admin/services` | Usluge | lista + modal (naziv, opis, trajanje, cena, aktivna) |
| 14 | `/admin/staff` | Zaposleni | lista + modal (ime, usluge koje radi, radno vreme po danima) |
| 15 | `/admin/clients` | Klijenti | lista sa pretragom, detalj: kontakt, istorija termina, napomena |
| 16 | `/admin/settings` | Podešavanja | podaci o biznisu i logo, radno vreme, pravila zakazivanja (interval, unapred N dana, otkazivanje X sati pre), neradni dani |

## Školjka

- Javni header: logo + naziv biznisa, „Zakaži" dugme, „Prijava" / avatar.
- Klijent: donja navigacija na telefonu (Zakaži, Moji termini, Profil), gornja na desktopu.
- Admin: hamburger meni na telefonu, bočni meni na desktopu (Danas, Kalendar, Termini, Usluge,
  Zaposleni, Klijenti, Podešavanja).

## Otvorena pitanja

1. Može li gost da zakaže **bez naloga** (samo ime + telefon), ili je nalog obavezan?
2. Da li je termin odmah **potvrđen**, ili admin mora da ga potvrdi?
3. Da li zaposleni imaju **svoj nalog** (vide samo svoj raspored), ili samo vlasnik ima admin pristup?
