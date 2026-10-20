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
| Podešavanja biznisa | — | backend gotov |
| Usluge (CRUD: naziv, trajanje, cena) | #15 | — |
| Zaposleni (usluge koje radi, radno vreme) | #16 | — |
| Zakazivanje termina (slobodni termini, potvrda) | #17 | — |
| Kalendar termina (admin dnevni / nedeljni prikaz) | #18 | — |
| Obaveštenja mejlom (potvrda, podsetnik, otkazivanje) | #19 | — |
| Recenzije | #21 | kasnije |
| Pregled / statistika za admina | #23 | kasnije |
| Slike (logo, galerija) | #24 | kasnije |

Zastareli issue-i iz marketplace modela (više biznisa): #13 (kreiranje biznisa pri registraciji
pružaoca), #20 (pretraga biznisa), #22 (omiljeni biznisi).

## Pravila (predlog, potvrditi)

- Termin se računa iz trajanja usluge; slobodni termini = radno vreme zaposlenog − zauzeti termini −
  blokirano vreme, u koracima od podesivog intervala (npr. 15 min).
- Klijent otkazuje najkasnije X sati pre termina (podešavanje).
- Zakazivanje unapred najviše N dana (podešavanje).
