# Zakazivanje

## Project

Aplikacija za online zakazivanje termina kod **jednog** biznisa (salon, berbernica, ordinacija...).
Nije multi-tenant: postoji jedan biznis čiji se podaci (naziv, delatnost, kontakt, logo) podešavaju
u Podešavanjima (`business_settings`, jedan red, `BusinessSetting::current()`), pa ista aplikacija
može da se postavi za drugi salon bez izmene koda.

- `frontend/`: Angular 20 standalone SPA (signals, Tailwind 4, bez UI frameworka).
- `backend/`: Laravel 13 API sa MySQL, JWT autentifikacijom (`firebase/php-jwt`), `zk_` prefiksom tabela.
- `docs/`: specifikacija, deploy uputstvo, radni tok, API rute.
- `sql/`: po jedan fajl za svaku `zk_` tabelu (šema + podaci iz lokalne baze), generiše
  `deploy/build-database.py`; deploy baze je jedan fajl `deploy/zakazivanje-baza.sql` (ista skripta).

Prati isti obrazac kao `D:\Playground\Angular\kosarkaska-evidencija` (a ona `pravni-predmeti`) —
pogledaj taj repo za referentne konvencije (auth interceptor, core/services po entitetu, deljene
komponente, deploy na cPanel) ako nešto ovde nije eksplicitno napisano.

Uloge: `client` (registruje se sam, zakazuje) i `admin` (vlasnik / osoblje, upravlja svime).
Middleware `role:admin` štiti admin rute; nove uloge (npr. zaposleni) dodaju se u `User::ROLES`.

## Working conventions

- Sva komunikacija sa korisnikom ide isključivo na srpskom (latinica) — odgovori, objašnjenja,
  pitanja, rezimei i poruke između koraka. Engleski ostaje samo u kodu i identifikatorima.
- Code is in English end to end — identifiers, DB tables/columns, routes, JSON payload keys
  (snake_case, kako ih Eloquent vraća). User-facing labels/text (UI strings, validation messages)
  are in Serbian.
- No code comments — identifiers should be self-explanatory. Don't add docblocks or explanatory
  comments to new code, and strip them when touching a file that already has them.
- Preserve unrelated user changes in the working tree.
- Keep edits focused and follow existing Angular and Laravel patterns.
- Deploy se radi **isključivo kad korisnik to eksplicitno traži** — nikad samoinicijativno, ni
  posle merge-a.
- API čitanja sa filterima idu kao `POST .../list` sa JSON telom, ne `GET` sa query parametrima.
  `GET` ostaje za id u putanji i javne podatke.
- Use `data-testid` for frontend test hooks. Keep `id` only where it is needed for label/form
  relationships.
- Destructive UI actions use the shared confirm dialog (`ConfirmService`); do not introduce
  `window.confirm()`.
- Do not add secrets to the repository. Local backend credentials belong in `backend/.env`,
  production values in `deploy/.env` (both outside git).
- Angular: signal-based API — `input()`/`input.required()`, `output()`, `viewChild()`, `model()`
  umesto dekoratora; `inject()` umesto DI kroz konstruktor; `host: {...}` umesto statičnog
  `@HostListener`. Nema `@NgModule`-a — sve je standalone.
- Serovane form komponente iz `shared/` ne implementiraju `ControlValueAccessor`; primaju
  reaktivni `FormControl` kao ulaz (`readonly control = input.required<FormControl<T>>();`).
- Nema getter/setter TS property-a — `computed()` za izvedene vrednosti, eksplicitna metoda ili
  `.set()`/`.update()` na signalu za promenu.
- Mobile-first: većina klijenata zakazuje sa telefona. Svaka stranica se prvo pravi za uzak ekran,
  pa se proširuje (`themes/breakpoints.scss`, Tailwind `sm:`/`md:`).

## Frontend styling i deljene komponente

- Tailwind (`frontend/src/styles.scss` uvozi `tailwindcss`, tokeni teme su u
  `frontend/src/themes/colors.scss` preko `@theme`). Boje isključivo preko tokena (`bg-primary`,
  `var(--color-...)`), nikad hardkodovan hex. Primarna boja je teal (`#0f766e`).
- Ponovljene kombinacije utility klasa grupiši u imenovanu klasu u `@layer components` u
  `styles.scss` (`.page-header`, `.actions-cell`, `.form-grid`).
- Deljene komponente (preuzete iz `kosarkaska-evidencija`): `appBtn` direktiva i `<app-button>`
  (sa `[loading]`), `<app-spinner>`, `appIcon` (SVG ikonice iz `public/icons/`, registar imena u
  `icon.directive.ts`), `appInput`, `<app-modal>`, `<app-error-message>`, `<app-confirm-dialog>`
  (`ConfirmService`), `<app-toast-container>` (`ToastService`), globalni loader (`LoaderService` +
  `loaderInterceptor`, `SKIP_LOADER` za tihe pozive). Ostale komponente iz košarkaške (select,
  time-picker, data-list, row-actions, segmented-control...) prenose se kad zatrebaju.
- Globalne klase: `.card`, `.field`/`.field-error`, `.form-error-banner`, `.badge*`, `.data-table`,
  `.avatar*`, `.empty-state`, `.auth-page`/`.auth-card`, `.content-container`.
- Format prikaza: datum `dd.mm.yyyy` (`SrDatePipe`), datum i vreme `SrDateTimePipe`, vreme `HH:mm`
  (24h), novac `1.500 din.` (`RsdPipe`). Ne formatirati ručno.
- Greške sa API-ja u poruku: `apiErrorMessage()` (`core/utils/api-error.ts`).
- Stanje učitavanja: svaka lista ima svoj `loading` signal; dok traje učitavanje prikazuje se samo
  globalni loader, nikad „Nema …" tekst. Šablon: `@if (loading() && items().length === 0) {} @else
  if (items().length === 0) { prazno stanje } @else { lista }`.

## Local development

Backend (from `backend/`):

```bash
composer install
php artisan migrate --seed
php artisan serve
```

Seed nalozi: admin `zakazivanje@fiskultura.rs` / `zakazivanje`, klijent Petar Petrović
`devtestzikaa@gmail.com` / `test`. Dugmad za brzu prijavu su na `/login` samo u development build-u
(`environment.development.ts` → `devLogins`); u produkciji ih nema.

Frontend (from `frontend/`):

```bash
npm install
npm start
```

Posle izmena pokreni relevantne testove: `php artisan test` (backend) i `npx ng build` (frontend).

## Current state

Implementirano: JWT auth (login, refresh sa rotacijom, logout, registracija klijenta, potvrda
email-a tokenom, zaboravljena / reset lozinke, izmena profila i lozinke), admin sekcija
(`/admin`, `AdminShellComponent`): zaposleni (usluge, radno vreme po danima sa više smena, boja,
režim potvrde po zaposlenom), usluge (kategorija, trajanje, cena, ko radi), cene i akcije
(`Promotion` + `PriceQuoteService`: paket, %, dinari, N+M, loyalty; period i dani), klijenti
(i bez naloga — `users.password` je `null`; registracija istim emailom preuzima zapis),
podešavanja (podaci o biznisu, logo kao data URL, tema iz boja logoa — `extractPalette()`,
`ThemeService.applyBrand()` računa nijanse `--color-primary/secondary/tertiary*`; režim potvrde
`manual` / `automatic`). Klijent posle prijave ima samo `/profile`. Sledeće: zakazivanje termina
(#17, uključujući ponavljajuće termine), kalendar (#18), obaveštenja (#19), javna početna.

Specifikacija: `docs/specifikacija.md`; API rute: `docs/api-rute.md` (ažurirati pri izmeni ruta);
radni tok: `docs/git-workflow.md`; deploy: `docs/DEPLOY.md`.
