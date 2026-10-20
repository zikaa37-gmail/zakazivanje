# Specifikacija — Zakazivanje

## Cilj

Klijenti online zakazuju termin kod jednog biznisa (salon, berbernica, ordinacija...) sa telefona,
bez poziva. Vlasnik i osoblje vide sve termine na jednom mestu, upisuju i termine primljene
telefonom i šalju podsetnike.

Aplikacija **nije multi-tenant** — jedan biznis po instalaciji. Naziv, delatnost, kontakt, logo,
radno vreme i pravila zakazivanja su u Podešavanjima, pa ista aplikacija može da se postavi za
drugi biznis.

## Uloge

| Uloga | Ko | Može |
| --- | --- | --- |
| gost | bilo ko | vidi početnu (usluge, cene, radno vreme, kontakt), započinje zakazivanje |
| `client` | registrovan klijent | zakazuje, vidi i otkazuje svoje termine, menja profil |
| `admin` | vlasnik / osoblje | kalendar, termini, usluge, zaposleni, klijenti, podešavanja |

## Celine (GitHub Issues)

| Celina | Issue | Status |
| --- | --- | --- |
| Auth (registracija, potvrda mejla, reset lozinke, profil) | PR #1 | gotovo (prebačeno na Laravel) |
| Podešavanja biznisa (podaci, logo, tema, pravila zakazivanja) | — | gotovo |
| Usluge (CRUD: naziv, trajanje, cena) | #15 | gotovo |
| Zaposleni (usluge koje radi, radno vreme) | #16 | gotovo |
| Zakazivanje termina (slobodni termini, potvrda, ponavljanje) | #17 | gotovo |
| Kalendar termina (admin dnevni / nedeljni prikaz) | #18 | — |
| Obaveštenja mejlom (potvrda, podsetnik, otkazivanje) | #19 | — |
| Recenzije | #21 | kasnije |
| Pregled / statistika za admina | #23 | kasnije |
| Slike (logo, galerija) | #24 | kasnije |

Zastareli issue-i iz marketplace modela (više biznisa): #13 (kreiranje biznisa pri registraciji
pružaoca), #20 (pretraga biznisa), #22 (omiljeni biznisi).

## Pravila (predlog, potvrditi)

- **Potvrda termina**: u Podešavanjima `ručno` / `automatski` (`business_settings.booking_confirmation`);
  svaki zaposleni može da ima svoj režim (`staff_members.booking_confirmation`, prazno = kao biznis) —
  `StaffMember::confirmationMode()`.
- **Ponavljajući termini** (uz #17): klijent ili admin zakazuje „svakog ponedeljka u 15:00" (nedeljno /
  na 2 nedelje, do datuma ili N puta). Čuva se pravilo ponavljanja, termini se prave unapred (npr. 8
  nedelja), a zauzet termin se prijavljuje adminu umesto da se tiho preskoči. Otkazivanje: samo taj
  termin ili ceo niz.
- **Cene i akcije** (`promotions`, `PriceQuoteService`): paket (više usluga po paket-ceni), popust u %
  ili dinarima, N+M gratis (npr. 2+1 po usluzi, broji se po klijentu), loyalty (svaka N-ta poseta X%).
  Akcija može da važi samo u periodu i određenim danima. Popusti se ne sabiraju — paket prvo, pa na
  svaku preostalu stavku najpovoljniji popust.

- Termin se računa iz trajanja usluge; slobodni termini = radno vreme zaposlenog − zauzeti termini −
  blokirano vreme, u koracima od podesivog intervala (npr. 15 min).
- Klijent otkazuje najkasnije X sati pre termina (podešavanje).
- Zakazivanje unapred najviše N dana (podešavanje).
