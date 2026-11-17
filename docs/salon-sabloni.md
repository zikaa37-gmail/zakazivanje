# Šabloni salona

Podaci jednog salona se čuvaju kao šablon u `backend/database/data/salons/<naziv>/`:

- `salon.json`:
  - `business`: podešavanja, bez AI ključa i Instagram tokena;
  - `opening_hours`, `shifts`;
  - `categories` (sa `active`), `services` (sa kategorijom po nazivu);
  - `staff`: radno vreme po danima i nedeljama rotacije, usluge po nazivu;
  - `promotions`: usluge po nazivu;
  - `accounts`: nalozi osoblja bez lozinke, `staff` = redni broj zaposlenog;
- `logo.(png|jpg|webp|svg)` i `cover.jpg` (naslovna fotografija), ako postoje.

Galerija, klijenti, termini i ostala istorija nisu deo šablona.

| Šablon | Šta je |
|--------|--------|
| `pink` | test salon „Frizerski salon Pink" sa kojim smo razvijali aplikaciju (frizerske usluge, 3 zaposlena, akcije) |
| `pink-starss` | Salon Pink Stars (u APR-u „Pink Starss“), Krajiška 59d, Zemun — kozmetika aktivna kao kategorije; frizerske kategorije pripremljene, ali isključene |

## Komande (iz `backend/`)

```bash
php artisan salon:export pink                    # trenutna baza → šablon (prepisuje folder)
php artisan salon:load pink-starss --keep-logins # BRIŠE SVE u bazi i učitava šablon
php artisan salon:load pink --keep-logins --demo # isto, pa demo klijenti i termini (DemoDataSeeder)
```

Opcije za `salon:load`:

- `--keep-logins`: zadržava naloge iz `QUICK_LOGIN_EMAILS` (brza prijava) sa istom lozinkom.
  - Nalog koji je bio vezan za zaposlenog (vlasnik koji radi usluge, radnik) preuzima slobodnog zaposlenog iz šablona, redom, i njegovo ime.
  - Radnik za kog nema slobodnog zaposlenog se ne vraća.
- `--keep-clients`: zadržava naloge klijenata (bez demo klijenata `@demo.zakazivanje.rs`), sa istim id-jem, ali bez termina i istorije.
- `--password=...`: lozinka za naloge iz šablona. Bez nje dobijaju nasumičnu (koristi se „Zaboravljena lozinka").
- `--demo`: posle učitavanja pokreće `DemoDataSeeder`. Treba mu bar jedna aktivna usluga i zaposleni.
- `--force`: bez pitanja.

Na serveru (bez SSH-a): `python deploy/deploy.py --salon=<naziv>` — posle deploy-a i migracija pokreće
`salon:load <naziv> --keep-logins --keep-clients --force`.

Pre učitavanja na serveru napraviti rezervnu kopiju baze (cPanel → Backup). Učitavanje briše **sve**: klijente, termine i
obaveštenja.

## Nov salon

1. `php artisan salon:export <naziv>` iz baze koja liči na novi salon, ili kopija foldera postojećeg šablona.
2. U `salon.json` promeniti:
   - `business`: naziv, delatnost, adresa, telefon, mreže, `pib`, `registration_number`, `theme_*` boje;
   - radno vreme, kategorije i usluge.

   Usluga bez cene ide sa `"price": "0.00"` i `"active": 0` i uključuje se kad se upiše cena.
3. Zameniti `logo.*`, kvadrat oko 512 px. Boje teme mogu da se ponovo izvuku iz loga u Podešavanja → Logo i boje.
4. `php artisan salon:load <naziv> --keep-logins` lokalno, pa provera. Na server ide kroz deploy sa `--with-db`, samo
   kad se to izričito traži (vidi `docs/DEPLOY.md`).

## Pink Starss — šta još treba upisati ručno

- Mejl salona. Tekući račun 325-9601700081122-85 (IPS QR i uplatnica), PIB 112319400 i MB 66023605 su upisani (APR: „Danijela Đokić PR Delatnost frizerskih i kozmetičkih salona Pink Starss Beograd (Zemun)“, osnovan 26.1.2021, šifra 9602).
- Cene i tačna trajanja usluga, pa ih uključiti; spisak usluga potvrditi sa salonom (elektroterapije, epilacija).
- Nalozi: Danijela Đokić (vlasnik i zaposlena), Luka i Vuk Matović (administrativni radnici; Luka koristi postojeći `luka@fiskultura.rs`), Tijana XXX (radnica) imaju privremene test mejlove i lozinku iz šablona — zameniti pravim mejlovima, telefonima i prezimenom pre pravih klijenata (i ukloniti `password` iz `salon.json`).
- Naslovna fotografija, galerija i povezivanje Instagrama.
- Frizerski deo: kad krene, uključiti kategorije „Frizer — …", pa usluge sa cenama.
