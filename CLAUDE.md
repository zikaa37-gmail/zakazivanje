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

Seed nalozi: admin `zakazivanje@fiskultura.rs` / `zakazivanje2026`, klijent Petar Petrović
`devtestzikaa@gmail.com` / `test`. Dugmad za brzu prijavu (Admin / Klijent) su na `/login` i lokalno i na serveru (`devLogins` u
`environment.ts` i `environment.development.ts`) — dok su podaci test; ukloniti pre pravih klijenata.

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
`manual` / `automatic`). Zakazivanje (#17): `AvailabilityService` (slobodni termini), `BookingService`
(zaključava zaposlene u transakciji, cena kroz `PriceQuoteService` sa istorijom klijenta, režim
potvrde zaposlenog), `RecurrenceService` + `appointments:extend-recurring` (svake noći 02:00, 8
nedelja unapred; zauzeti datumi u `skipped_dates`), gost bez naloga (vezuje se po telefonu / emailu
za klijenta bez lozinke), pravila u Podešavanjima (`slot_interval_minutes`, `booking_lead_minutes`,
`booking_horizon_days`, `booking_min_days_ahead` (podrazumevano 1 = najranije sutra),
`cancellation_days_before` (podrazumevano 1 = najkasnije dan pre), `allow_guest_booking`). Frontend: javna školjka
(`PublicShellComponent`, donja navigacija na telefonu) sa početnom, `/book` (4 koraka, stanje u
`BookingDraftService` / sessionStorage — preživi odlazak na prijavu), `/my-appointments`,
`/register`, `/verify-email`; klijent pomera termin iz Moji termini (`RescheduleComponent`, `BookingService::moveByClient`); admin `/admin/appointments` (filteri, statusi, novi termin sa
ponavljanjem, broj termina na čekanju u meniju). Obaveštenja (#19): `AppointmentNotifier` (jedino
mesto koje odlučuje šta se šalje — poziva se iz kontrolera, ne iz `BookingService`), `AppointmentNotification`
(primljen / potvrđen / otkazan / podsetnik, `.ics` prilog) i `AdminAppointmentNotification` (novi online
termin, klijent otkazao), kanali po `User::notificationChannels()` (izbor klijenta, pa drugi kanal ako
izabranog nema), WhatsApp preko Twilio-a (`WhatsAppChannel`, bez ključeva → „preskočeno"), sve se
beleži u `notification_logs` (mejl preko `NotificationSent` / `NotificationFailed`), podsetnici
`appointments:send-reminders` (na 15 min; ne šalje se za termine zakazane unutar prozora), uključivanje
po vrsti i vreme podsetnika u Podešavanjima → Obaveštenja; ponavljanje šalje jednu poruku za ceo niz.
Obaveštenja idu kroz red (`ShouldQueue`, `afterCommit`); lokalno je `QUEUE_CONNECTION=sync` i
`MAIL_MAILER=log` (mejlovi u `backend/storage/logs/laravel.log`). Frontend: `/forgot-password`,
`/reset-password`. Kalendar (#18): `/admin/calendar` — dan (kolona po zaposlenom, prevlačenje termina
= `reschedule`, klik na prazno = novi termin), nedelja (kolona po danu, preklapanja u trake), mesec
(`<app-month-calendar>`, deljena komponenta; koristi je i klijent u „Moji termini → Kalendar"),
blokade vremena, boje po statusu; modal novog termina je `AppointmentFormComponent`, detalji
`AppointmentDetailsComponent`, akcije `AppointmentActionsService` (koriste ih lista i kalendar).
Pregled (#23): `/admin/dashboard` je početna admina — danas (raspored, sledeći klijent, potvrda zahteva,
ko radi), statistika za 7 / 30 / 90 dana ili tekući mesec u odnosu na prethodni period (`DashboardService`:
prihod samo od završenih, popunjenost = zauzeto / radno vreme bez blokada), stubičasti grafikon
`<app-column-chart>` (deljena komponenta, boje `--color-chart*` izvedene iz primarne boje).
Galerija (#24): admin `/admin/gallery` (više slika odjednom, smanjuju se u pregledaču na 1600 px i šalju
jedna po jedna, opis, usluga, skrivanje, prevlačenje za redosled), javno `/gallery` (filter po usluzi,
`<app-gallery-viewer>` preko celog ekrana, „Podeli" = Web Share sa fajlom — Instagram / WhatsApp na
telefonu) i poslednjih 6 na početnoj; slika je data URL u `gallery_images.data`, servira se kao fajl.
Deljenje (kao u košarkaškoj): mreže `instagram` / `facebook` / `tiktok` / `youtube` u Podešavanjima (ime ili ceo
link, `socialLinks()` u `core/utils/social.ts` pravi URL), ikonice `<app-social-links>` u dnu javnih stranica;
admin `/admin/share` — slika za Instagram na canvasu (`share-image.ts`: zakaži online sa QR, akcija, cenovnik,
slika iz galerije; 4:5, kvadrat, story) i QR kod za štampu (`POST /share/qr`, `chillerlan/php-qrcode`).
Plaćanje (kao u košarkaškoj): Podešavanja → Plaćanje (`bank_account`, primalac, šifra 289,
`online_payment_enabled`); `PaymentService` pravi NBS IPS QR (`K:PR|V:01|C:1|R:…|RO:97…`, poziv na broj
mod 97 od id termina) i PDF uplatnicu (`barryvdh/laravel-dompdf`, `pdf/payment-slip`); klijent „Plati" u
Moji termini (`<app-payment-dialog>`), admin u detaljima termina beleži gotovina / kartica / račun (`paid_at`,
`payment_method`) ili pokazuje IPS QR na kasi. Kartično plaćanje preko interneta nije uključeno (treba ugovor sa bankom).
Recenzije (#21): `Review` (jedna po terminu, izmena do 30 dana), `ReviewService`; kad admin označi termin
„Završen", `AppointmentNotifier` šalje `ReviewRequestNotification` (link `/my-appointments?review={id}`,
samo klijentu sa nalogom; `notify_review_request`); javno `/reviews` i blok na početnoj (`<app-review-summary>`,
`<app-review-card>`, `<app-stars>`), admin `/admin/reviews` (prosek po zaposlenom, odgovor, sakrivanje);
unos ocene `<app-star-input>` (prima `FormControl`). Prekidač `reviews_enabled` u Podešavanja → Zakazivanje.
Usluge za žene / muškarce: `services.audience` (`all` / `female` / `male`), `users.gender` (registracija, profil,
admin → klijenti); `BookingService::ensureAudience()` odbija uslugu za drugi pol i mešanje muških i ženskih u istom
terminu (važi i za admina), a nepoznat pol klijenta upisuje po prvoj takvoj usluzi; `/book` korak 1 nudi „Za žene /
Za muškarce" dok pol nije poznat.
Naslovna fotografija: Podešavanja → Logo i boje, `<app-image-cropper>` (pomeranje, zum, 16:9 → JPEG do 1600 px),
`business_settings.cover_image` (skriveno iz JSON-a, servira se kao fajl preko `cover_url`); početna prikazuje
fotografiju sa imenom i „Zakaži termin", a bez nje samo kompaktnu traku.
Radno vreme: `opening_hours` (salon po danima, podrazumevano pon–sub 08–20) i `shifts` (Pre podne / Popodne / Ceo dan)
u Podešavanja → Radno vreme (šalju se uz `PUT /business-settings`). Zaposleni: `rotation_weeks` (1 = isto svake
nedelje, 2–4 = smenski) + `rotation_starts_on` (ponedeljak 1. nedelje), `staff_working_hours.week`;
`StaffMember::hoursOn($date, OpeningHour::week())` je jedini izvor radnog vremena za dan (nedelja rotacije ∩ salon) —
koriste ga dostupnost, pregled i (kao `hoursOn()` u `core/utils/schedule.ts`) kalendar. Smena mora biti u radnom
vremenu salona (validacija), a kad se salon skrati, sati zaposlenih se seku.
Omiljeni frizer: `users.favorite_staff_member_id` (profil, admin → klijenti, „Zapamti kao mog frizera" u koraku
„Kod koga?" → `PUT /auth/favorite-staff`); `/book` ga stavlja prvog sa oznakom „Tvoj frizer" i unapred bira, pa se
nude samo njegovi termini (klijent može da promeni).
Javni deo (početna, usluge, cene, slobodni termini) radi bez naloga; za zakazivanje je potreban nalog
(`allow_guest_booking` podrazumevano isključen — registracija iz koraka 4 odmah prijavljuje i vraća na potvrdu).

Specifikacija: `docs/specifikacija.md`; API rute: `docs/api-rute.md` (ažurirati pri izmeni ruta);
radni tok: `docs/git-workflow.md`; deploy: `docs/DEPLOY.md`.
