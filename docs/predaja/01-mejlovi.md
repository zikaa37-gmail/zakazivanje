# 1. Mejlovi salona

[← Predaja](README.md)

Mejlovi se prave u hostingu domena (cPanel → **Email Accounts**), besplatni su uz hosting. Primer za domen
`salon-primer.rs`:

| Mejl | Za šta | Ko ga čita |
|------|--------|-----------|
| `obavestenja@salon-primer.rs` | aplikacija šalje sa njega: potvrde, podsetnike, reset lozinke, izveštaje (`MAIL_USERNAME`, `MAIL_FROM_ADDRESS`, `WEBPUSH_SUBJECT`) | niko redovno; povremeno proveriti odbijene poruke |
| `info@salon-primer.rs` (ili postojeći mejl salona) | kontakt na sajtu (Podešavanja → Biznis), odgovori klijenata | vlasnik / recepcija |
| `nalozi@salon-primer.rs` | otvaranje spoljnih naloga (Anthropic, Twilio, Pusher, Meta) — da ne zavise od ličnog mejla | vlasnik (i mi dok podešavamo) |
| lični mejl vlasnika | nalog **vlasnika** u aplikaciji | vlasnik |
| lični mejl menadžera | nalog **menadžera** | recepcija |
| mejl svakog zaposlenog | zaposleni sa mejlom automatski dobija nalog radnika (Zaposleni → mejl i telefon su obavezni) | svaki radnik |

Napomene:

- Lični mejlovi (Gmail i sl.) su sasvim u redu za naloge vlasnika i radnika — ne moraju na domenu.
- Lozinku za `obavestenja@` upisujemo samo u `deploy/.env` (`MAIL_PASSWORD`), nikad u kod.
- Posle podešavanja poslati probni mejl na Gmail i proveriti da ne ide u spam. Ako ide: u cPanel-u
  → **Email Deliverability** uključiti SPF i DKIM za domen (jedan klik „Repair").

## Šta tražimo od salona

- Domen (ili da ga mi zakupimo na njihovo ime).
- Imena i mejlovi: vlasnik, menadžer (ako postoji), svi zaposleni (ime, prezime, mejl, telefon).
- Mejl / telefon za kontakt koji se prikazuje klijentima.
