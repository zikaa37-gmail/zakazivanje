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

Uloge: `client` (registruje se sam, zakazuje), `owner` (vlasnik) i `worker`. Radnik vezan za zaposlenog
(`users.staff_member_id`) je onaj koji radi usluge: pregled dana i izveštaji samo za sebe, kalendar, termini, blokade, klijenti
bez brisanja, lista čekanja. Radnik bez zaposlenog je menadžer (Zaposleni → Nalozi za prijavu, `/admin/team`) i radi umesto
vlasnika: `User::isManager()` (vlasnik ili menadžer) — zaposleni, usluge, cene, recenzije, galerija, podeli,
nalozi, podešavanja, brisanje klijenata i zone. Samo vlasniku ostaju finansijska statistika (`dashboard/stats`, `dashboard/sources`)
i nalozi vlasnika (menadžer ne pravi, ne menja i ne briše vlasnika). Rute: `role:owner,worker` za svakodnevni rad,
`role:manager` za upravljanje, `role:owner` za finansije; frontend `staffGuard` / `managerGuard`, meni po `managerOnly`;
vlasnik i menadžer imaju meni u dva taba, Svakodnevno i Upravljanje (`section` u `AdminShellComponent`).
Menadžer izveštaje samo šalje vlasniku (`/reports/send`), ne vidi ih (`/reports`, `/reports/pdf` → 403) i ne dobija
automatske. Naplata: `appointments.tip` (bakšiš, nije prihod); „Završen“ svuda otvara `<app-complete-dialog>` (`CompletionService`, u `AdminShellComponent`): usluga odrađena / delimično / nije (`service_outcome`), za naplatu (`due_amount`), plaćeno u celosti / delimično / nije (`paid_amount`), bakšiš i `appointments.completion_note` (beleška posle termina, `POST /appointments/{id}/complete`; `admin_note` i `completion_note` vidi samo osoblje — `Appointment::toArray()`), beleške u istorijatu klijenta (`work_notes`); dug = `Appointment::outstanding()` (prihod u izveštajima = `dueAmount()`, naplaćeno = `paidAmount()`), praćenje: lista termina filter „Naplata“ (`billing`, „Za naplatu“ bez obzira na period), kartica „Za naplatu“ na Pregledu, „Naplati ostatak“ u meniju ⋮; izveštaj računa naplaćeno za sve neotkazane termine sa `paid_at`.
Svaki zaposleni sa emailom automatski ima nalog radnika (`StaffAccountService::sync()`);
zaposleni se ne briše nego deaktivira (`POST /staff/{id}/active`, termini i statistika ostaju na njegovom imenu). Uloge su enum `UserRole` (`app/Enums/UserRole.php`) (`role` je cast na enum, podrazumevano `client`), na frontendu `Role` / `STAFF_ROLES` u `user.model.ts`; nove uloge idu tu. Uloga zaposlenog se bira i u formi zaposlenog (`role` uz `PUT /staff/{id}`, ista pravila kao Nalozi), umesto nekadašnje „Pozicije“.

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
  `window.confirm()`. Isto važi za sve što može da napravi problem (statusi termina, onemogućavanje, odobravanje).
  Brisanje ne sme da ostavi siročiće: zaposleni sa budućim terminima se ne deaktivira dok se termini ne reše
  (`StaffDeactivationService`, `GET /staff/{id}/future-appointments`, `cancel_future`), klijent sa istorijom se ne briše
  (`POST /clients/{id}/delete-check`). U meniju „⋮“ (`app-row-actions`) opasne radnje idu na dno, iza linije.
- Prikaz po nalogu: `users.ui_mode` (`standard` / `spacious`, Nalozi za prijavu i Profil, `PUT /auth/ui-mode`) — klasa
  `ui-spacious` na `<html>` (veća dugmad i razmaci, potvrda se uključuje posle 1,2 s). Redovi koji su „ugašeni“ koriste `.is-dimmed`, ne `opacity`.
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
- Zaglavlje stranice: `.page-header` > `.page-title-row` (`h1.page-title`, opciono `.page-count`, `<app-info-tip>` sa opisom
  stranice) — bez `.page-subtitle` ispod naslova; dugme „+ Novo…“ u zaglavlju ima tekst u `max-sm:sr-only` (na telefonu samo +).
- Ponovljene kombinacije utility klasa grupiši u imenovanu klasu u `@layer components` u
  `styles.scss` (`.page-header`, `.actions-cell`, `.form-grid`).
- Deljene komponente (preuzete iz `kosarkaska-evidencija`): `appBtn` direktiva i `<app-button>`
  (sa `[loading]`), `<app-spinner>`, `appIcon` (SVG ikonice iz `public/icons/`, registar imena u
  `icon.directive.ts`), `appInput`, `<app-modal>`, `<app-error-message>`, `<app-confirm-dialog>`
  (`ConfirmService`), `<app-info-tip heading="…">` (ikonica „i“ uz polje, objašnjenje se otvara klikom), `<app-toast-container>` (`ToastService`), globalni loader (`LoaderService` +
  `loaderInterceptor`, `SKIP_LOADER` za tihe pozive). Ostale komponente iz košarkaške (select,
  time-picker, data-list, row-actions, segmented-control...) prenose se kad zatrebaju.
- Filteri lista i kalendara: `.sticky-toolbar` (ostaje gore dok se sadržaj skroluje) — periodi / prikaz uvek vidljivi, ostali filteri u
  `<app-accordion>` „Filteri (n)“; izbor datuma `<app-date-picker-dialog>` (mesec sa brojem termina po danu, `staffMemberId`).
- Globalne klase: `.card`, `.field`/`.field-error`, `.form-error-banner`, `.badge*`, `.data-table`,
  `.avatar*`, `.empty-state`, `.auth-page`/`.auth-card`, `.content-container`.
- Format prikaza: datum `dd.mm.yyyy` (`SrDatePipe`), datum i vreme `SrDateTimePipe`, vreme `HH:mm`
  (24h), novac `1.500 din.` (`RsdPipe`). Ne formatirati ručno.
- Greške sa API-ja u poruku: `apiErrorMessage()` (`core/utils/api-error.ts`).
- Stanje učitavanja: svaka lista ima svoj `loading` signal; dok traje učitavanje prikazuje se samo
  globalni loader, nikad „Nema …" tekst. Šablon: `@if (loading() && items().length === 0) {} @else
  if (items().length === 0) { prazno stanje } @else { lista }`.

## Local development

Sve odjednom: `node dev.mjs` iz korena. Portovi: frontend 4200 / backend 8000, a ako su zauzeti (drugi projekti) 5110 / 8110 —
`frontend/serve.mjs` (`npm start`), `App\Console\Commands\ServeCommand` (`php artisan serve`) i `frontend/dev-ports.mjs`.
`/api` ide preko `frontend/proxy.conf.mjs`, koji pri startu nalazi backend (`API_PORT` iz `dev.mjs`); na lokalu CORS pušta sve.

Backend (from `backend/`):

```bash
composer install
php artisan migrate --seed
php artisan serve
```

Seed nalozi: vlasnik `zakazivanje@fiskultura.rs` / `zakazivanje2026`, menadžer `radnik@fiskultura.rs` /
`radnik2026`, klijent Petar Petrović
`devtestzikaa@gmail.com` / `test`. Dugmad za brzu prijavu (Vlasnik / Menadžer / Radnik (Jelena, `jelena@demo.zakazivanje.rs` / `radnik2026`, iz DemoDataSeeder-a) / Klijent) su na `/login` i lokalno i na serveru (`devLogins` u
`environment.ts` i `environment.development.ts`) — dok su podaci test; ukloniti pre pravih klijenata.

Frontend (from `frontend/`):

```bash
npm install
npm start
```

Šabloni salona (`docs/salon-sabloni.md`): `backend/database/data/salons/<naziv>/` (`salon.json` + logo), `php artisan salon:export <naziv>` i
`php artisan salon:load <naziv> --keep-logins [--demo]` (BRIŠE celu bazu; `SalonTemplateService`); šabloni `pink` (test frizerski salon) i `pink-starss` (lokalno učitan).
Demo podaci za ručno testiranje: `php artisan db:seed --class=DemoDataSeeder` — 32 klijenta `@demo.zakazivanje.rs`
(lozinka `test`, neki bez naloga), termini od pre 60 do za 21 dan po radnom vremenu zaposlenih, naplate, recenzije,
aktivnost, nekoliko klijenata u žutoj / narandžastoj zoni i nalog radnika za prvog zaposlenog (`<ime>@demo.zakazivanje.rs` /
`radnik2026`). Ponovno pokretanje briše prethodne demo klijente i pravi nove.

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
potvrde zaposlenog, a usluga ga nadjačava: bar jedna „ručno“ → čeka potvrdu, sve „automatski“ → potvrđen; `BookingService::confirmsAutomatically()`), `RecurrenceService` + `appointments:extend-recurring` (svake noći 02:00, 8
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
link, `socialLinks()` u `core/utils/social.ts` pravi URL), ikonice `<app-social-links>` (krugovi u bojama mreža, tokeni `--color-brand-*`) samo u dnu javnih stranica;
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
Nadimak klijenta: `users.nickname` (upisuje bilo ko iz osoblja — detalji termina, istorijat, forma klijenta; `PUT /clients/{id}/nickname`). U `$hidden`,
`User::toArray()` ga dodaje samo kad je prijavljen neko iz osoblja — klijent nikad ne vidi nadimak. U salonu se prikazuje umesto imena i prezimena:
backend `User::salonName()` (obaveštenja, toast, izveštaji, chat za osoblje), frontend pipe `clientName` / `clientName()` iz `core/utils/client-name.ts`;
pri učitavanju klijenta sa listom kolona dodati `nickname`. Lista klijenata pokazuje i pravo ime, pretraga radi i po nadimku.
Omiljeni frizer: `users.favorite_staff_member_id` (profil, admin → klijenti, „Zapamti kao mog frizera" u koraku
„Kod koga?" → `PUT /auth/favorite-staff`); `/book` ga stavlja prvog sa oznakom „Tvoj frizer" i unapred bira, pa se
nude samo njegovi termini (klijent može da promeni).
Lista čekanja (#49): `WaitlistEntry` (klijent, dan, opciono zaposleni, deo dana pre podne < 14:00 / popodne),
`WaitlistService::slotFreed*()` posle otkazivanja / pomeranja (admin i klijent) šalje `WaitlistNotification` svima
kojima sada postoji slobodan termin (najviše na 30 min), link `/book?services=&staff=&date=` otvara korak „Termin";
zakazivanje tog dana gasi prijavu. Pun dan je u `/book` isprekidan i može se izabrati; prekidač `waitlist_enabled`.
Usluge su na početnoj i u `/book` grupisane po kategoriji (`groupByCategory()` u `service.model.ts`, bez
kategorije → „Ostalo") sa filterom kategorija (`.chip-scroll`) — frizerske i kozmetičke usluge istog salona.
Kategorije usluga: tabela `service_categories` (naziv, `sort_order`, `active`), `services.service_category_id`; usluga u JSON-u nosi
`category` (naziv). Usluge → tab „Kategorije“ (dodavanje, preimenovanje, redosled strelicama, deaktivacija uz ponudu da se preimenuje,
brisanje samo prazne). Deaktivirana kategorija sakriva svoje usluge iz online zakazivanja (`Service::offeredOnline()`,
`AvailabilityService::servicesInOrder($ids, true)`), salon ih i dalje zakazuje. „Predloži usluge“ (`<app-service-suggestions>`, samo uz uključen AI): AI predlog ili šablon po
delatnosti (`core/utils/service-presets.ts`) ili AI predlog → pregled i izmena → `POST /service-categories/apply` (usluga bez cene je neaktivna).
AI pomoćnik: Podešavanja → AI pomoćnik (`ai_enabled`, ključ šifrovan u `business_settings.ai_api_key`, rezerva `ANTHROPIC_API_KEY`),
`AiService` (Claude, `claude-opus-5-5`, strukturisan JSON, serverski fallback) — svaka nova AI funkcija ide kroz `AiService::json()` i
prikazuje se samo kad je `ai_available`. Naziv zaposlenog: `staff_term` / `staff_term_genitive` (Podešavanja → Biznis, lista po delatnosti
`STAFF_TERMS` u `core/utils/staff-terms.ts` — samo izbor, oba oblika dolaze iz liste — ili AI), u frontendu `BusinessSettingService.staffTerm()` / `staffTermGenitive()` — ne pisati „frizer“ u kodu.
Razdvojeni delovi: javni deo (`PublicShellComponent` — početna, `/book`, galerija, `/my-appointments`, `/profile`) je samo za klijente i
goste (`clientAreaGuard` preusmerava osoblje na `/admin`), admin je samo za osoblje (`staffGuard`). Profil osoblja je `/admin/profile`
(`StaffProfileComponent`: kanal obaveštenja, lozinka; ime i telefon samo ako nije vezan za zaposlenog — inače dolaze sa stranice Zaposleni),
klijentski `/profile` ima pol i omiljenog radnika; promena lozinke je deljena `<app-change-password>`.
Izveštaji (#58): `/admin/reports` (vlasnik i radnik; zaposleni-radnik vidi samo svoj) — zbirni ili po zaposlenom,
dan / nedelja / mesec; `ReportService` (brojke, `pdf/report` blade), „Otvori PDF", „Pošalji na mejl / WhatsApp"
(`ReportNotification`, WhatsApp dobija potpisan link na PDF u `storage/app/reports`, briše se posle 7 dana);
automatsko slanje `reports:send-scheduled` u 21h (dnevni, nedeljni nedeljom, mesečni poslednjeg dana) uključuje se u
Podešavanja → Obaveštenja (`report_auto_*`, podrazumevano isključeno).
Disciplina klijenata (#55): poeni za otkazivanje klijenta (kasno = manje od 24 h), nedolazak, u periodu
`discipline_window_days`; zone `users.discipline_zone` — žuta (kasniji / kraći period, svaki termin čeka potvrdu, i samo manje traženi sati:
`DemandService` — zauzetost po danu u nedelji i satu iz poslednjih 90 dana, donjih `discipline_off_peak_percent` %),
narandžasta (tiho: dostupnost prazna, dani „puni", zakazivanje vraća „Termin je u međuvremenu zauzet"), crvena
(suspendovan, `user.suspended`, `/suspended`, 403). `ClientDisciplineService` je jedino mesto za pravila (dostupnost,
`BookingService`, lista čekanja); automatska crvena samo uz `discipline_auto_suspend`; ručna zona (vlasnik) sa razlogom i
rokom; `clients:refresh-discipline` u 03:00. Aktivnost klijenta (prijava, pregled termina, pokušaji, otkazivanja...) ide kroz
događaj `ClientActivity` → `client_activity_logs`; vlasnik dobija mejl kad klijent pređe u višu zonu i kad blokiran
pokušava (jednom dnevno). Vlasnik i radnik vide zonu i istorijat (Klijenti → Istorijat i zona, `?history={id}`); salon
može da zakaže blokiranom uz upozorenje. Podešavanja discipline i izveštaja se ne vraćaju javno (`/public/business`
samo osoblju). Klijenta u formi termina i u „Nova poruka“ bira deljena `<app-select-search>` (prima `FormControl`, `[loading]` dok stižu podaci — nikad „Nema rezultata“ pre odgovora) nad `ClientDirectoryService` (svi klijenti jednom, `POST /clients/directory`, signal, osvežava se posle 5 min ili izmene klijenta); filtriranje je na frontendu, bez kvačica (`core/utils/search.ts`).
Landing i Instagram (#65): početna je landing za sve (naslovna ili prva fotografija salona, ocena / danas radimo / grad / poziv, „Naš salon" slajder
(`gallery_images.kind = salon`), „Naši radovi" (`featured`, inače poslednji radovi), usluge, objave sa Instagrama, „Kako do nas" (Google mapa
iz adrese i grada ili koordinata (`map_query`, Podešavanja → Biznis → Adresa i mapa, sa pregledom mape), bez API ključa, dugme „Otvori u Google mapama“; na desktopu pored radnog vremena), telefoni `mobile_phone` pa `phone` (fiksni), WhatsApp / Viber na broju `messaging_phone` (`mobile` / `landline`) — sve u `core/utils/business-contact.ts`, utisci na dnu); neulogovanom „Zakaži termin" nudi prijavu / registraciju / pregled termina.
Praćenje izvora: `?izvor=&kampanja=` (i `utm_*`, referrer instagram/facebook/tiktok/google) pamti `MarketingService.capture()` 30 dana;
poseta → `marketing_visits`, registracija → `users.signup_source`, termin → `appointments.referral_source`; Pregled → „Odakle dolaze klijenti",
Podeli → „Linkovi za Instagram" (QR za štampu nosi `izvor=qr`). Instagram i Meta (#67): Podešavanja → Instagram i Meta — „Poveži sa Instagramom" (OAuth, `config/instagram.php`, `INSTAGRAM_APP_*`
u `.env`; bez njih ručni token), prekidači po funkciji (`instagram_feed_enabled`, `instagram_insights_enabled`), preporuke za profil i link
za bio. Token je šifrovan u bazi (`InstagramService`).
Objavljivanje (#69): prekidač `instagram_publishing_enabled`; Podeli → „Objavi na Instagram" (canvas → JPEG, objava ili story, odmah
ili zakazano) → `instagram_posts` (slika kao data URL, javno `/public/instagram-media/{token}`, briše se posle objave),
`InstagramPublisher` (kontejner → čekanje `status_code` → `media_publish`, greške u `error`), `instagram:publish-scheduled` na 5 min.
Opcioni story „Slobodni termini" (`instagram_free_slots_*`: dani, vreme) — `FreeSlotsStoryService` (slobodni termini za sutra samo u
manje traženim satima iz `DemandService`, slika 1080×1920 kroz GD i DejaVu iz dompdf-a); bez takvih termina red je „Preskočeno".
Statistika (#68): Pregled → „Odakle dolaze klijenti" — lestvica za Instagram (doseg → posete profilu → klik na link iz `InstagramService::insights()`,
pa naše posete → registracije + prijave postojećih (`marketing_visits.logins`) → termini (novi klijenti = prvi termin) → prihod) i najbolje objave.
Pregled: grafikoni su opcioni (prekidač „Prikaži grafikone", pamti se u pregledaču, podrazumevano isključeno); klik na stub dana i
„Svi današnji termini" vode na `/admin/appointments?date=YYYY-MM-DD|today`.
Javni deo (početna, usluge, cene, slobodni termini) radi bez naloga; za zakazivanje je potreban nalog
(`allow_guest_booking` podrazumevano isključen — registracija iz koraka 4 odmah prijavljuje i vraća na potvrdu).

Uputstvo za korisnike (#75): statički HTML u `frontend/public/uputstvo/`, u aplikaciji `/uputstvo/index.html` (link „Uputstvo" u meniju osoblja i u profilu).
Stranice: `index.html` (uvod i kartice), `vlasnik.html` (vlasnik i menadžer: prvo podešavanje i Upravljanje), `svakodnevni-rad.html`,
`radnik.html`, `klijent.html` (može da se pošalje klijentima) i `prijava-i-nalozi.html`; zajednički `uputstvo.css` i `uputstvo.js` (boje, naziv i logo
salona iz `GET /api/public/business`, uz neutralne podrazumevane boje). Svaki korak je `<details class="step">` sa `<span class="num">`, zatvoren osim prvog;
broj u tekstu (`<span class="badge">`) odgovara crvenoj oznaci na slici. Slike sa telefona (390×844) su u `slike/`. Ponovo se snimaju sa
`node docs/uputstvo/snimi-slike.js frontend/public/uputstvo/slike [ime1,ime2]` dok radi `node dev.mjs` (`APP_URL`, podrazumevano http://localhost:4200): skripta se prijavljuje
dugmićima za brzu prijavu, pravi privremenu akciju INSTA10, pauzu usluge, jedan termin klijenta i termin radnika koji je u toku (za dugme „Završen“), pa ih na kraju briše (i obaveštenja u zvoncetu) (`php artisan tinker`), a slike upisuje
tek na kraju (upis u `public/` usred snimanja bi osvežio aplikaciju). Posle izmena ekrana ažurirati uputstvo i slike; slika koju nijedna stranica ne koristi se briše.
PDF se pravi kad se potvrdi da je sve obuhvaćeno.
Potvrda termina po usluzi: `services.booking_confirmation` (bar jedna „ručno“ → čeka, sve „automatski“ → potvrđen, inače zaposleni pa salon;
`BookingService::confirmsAutomatically()`). Usluga se onemogućava (`active`) ili pauzira do datuma (`paused_until`: online se ne nudi do tog dana,
`AvailabilityService::pausedOn()`); briše se samo ako nikad nije zakazana. Kodovi za popust: `promotions.code` (+ `max_uses`, `once_per_client`),
akcija sa kodom važi samo uz `promo_code` pri zakazivanju (`PriceQuoteService::quote`), upotreba se broji preko `appointment_items.promotion_id`;
šabloni praznika u `core/utils/promo-presets.ts`, `/book?kod=`. Naplata beleži bakšiš (`appointments.tip`). Registracija: nalog klijenta je aktivan
tek posle linka iz mejla (`email_verification_sent_at`, važi `User::VERIFICATION_DAYS` = 3, link prijavljuje i vraća na `next`); ponovna registracija
nepotvrđenog mejla ažurira nalog i šalje novi link; zaštita od botova: polje `website` i `started_at` (< 3 s). Beleške osoblja su teme (`staff_notes.title`, spisak tema + prepiska kao na Porukama; `staff_notes`,
`staff_note_recipients`): status novo / preuzeto (`taken_by`) / urađeno, pročitano po primaocu, obaveštenje izabranima + uvek
`business_settings.note_always_notify_ids` (podrazumevano vlasnici i menadžeri). Prepiska: `staff_note_replies` (`POST /notes/{id}/replies`), odgovor dodaje autora i onog ko odgovara u
`staff_note_recipients` i ostalima vraća `read_at` na null; `staff_notes.last_reply_at` — urađena beleška sa novijim odgovorom je opet nepročitana.
Odgovor ide samo u zvonce + push (`StaffNoteReplyNotification`, link `/admin/notes?note={id}` otvara i označava pročitanom), bez mejla / WhatsApp-a. Zaposleni mora imati email i telefon.
Odsustva (bolovanje / odmor): `/admin/absences`, `StaffAbsence` + `StaffAbsenceService` — upisuje bilo ko iz osoblja, odobrava menadžer
(njegov upis je odmah odobren), odobrenje pravi `BlockedTime` za cele dane; „Izmeni“ (`PUT /staff-absences/{id}`) je odvojeno od novog upisa, period bira deljena `<app-date-range>` (`from` / `to` `FormControl<string>`, `min`). Pogođeni termini: telefon klijenta, „Prebaci“ (izbor kolege slobodnog u isto
vreme, `AvailabilityService`), „Pošalji da sam pomeri“ (`ask-reschedule`), otkazivanje. Prebacivanje (promena zaposlenog u `reschedule`, i iz detalja
termina „Prebaci kolegi“) obaveštava klijenta, oba zaposlena i menadžere. `appointments.free_change_reason` (`transferred` / `salon_request`): klijent
pomera i otkazuje bez roka, a to otkazivanje ne donosi poene discipline.
Prevlačenje u kalendaru šalje `delay_notice`: `ChangeNoticeService` pamti stanje pre prvog pomeranja (`appointments.change_notice`) i rok
`change_notice_at` = poslednje pomeranje + 2 min; `appointments:send-change-notices` (svaki minut) šalje jedno obaveštenje prema konačnom stanju
(prebačen / pomeren / ništa ako je vraćen ili otkazan). Odmah ide samo uživo osvežavanje; „Prebaci kolegi“ šalje odmah i preuzima stanje na čekanju.
Naplata kasnog otkazivanja: `cancellation_fee_enabled` (Podešavanja → Zakazivanje) — posle roka `cancellation_days_before` klijent može samo da otkaže
(ne i da pomeri) uz `accept_late`; `CancellationFeeService` je jedino mesto za pravila. Svako kasno otkazivanje je red u `cancellation_fees`
(`free` dok traje odbrojavanje `cancellation_free_late` u `cancellation_fee_window_days`, pa `open` → `paid` / `waived`; oprošteno se ne broji).
Iznos: `fixed` / `percent` / `service_plus_fixed` za salon, a usluga ga nadjačava (`services.cancellation_fee_*`, `none` = bez naknade i bez brojanja,
manji `cancellation_free_late` usluge u terminu važi); klijentu umanjenje `users.cancellation_discount_*` (`fixed` / `percent` / `exempt`). Klijent vidi
odbrojavanje i objašnjenje (`cancellation_fee_note`) u `<app-late-cancel-dialog>` i dug u Moji termini; salon „Klijent otkazao“ upisuje naknadu, a
`<app-client-fees>` (detalji termina, istorijat klijenta) beleži naplatu, a menadžer oprašta ili menja iznos uz razlog. `free_change_reason` je izuzet.
Vreme čekanja (farbanje): usluga može imati rad → čekanje → rad (`services.processing_after_minutes` + `processing_minutes`, ostatak trajanja je rad
na kraju, bar 5 min); termin pamti `appointments.processing_offset` / `processing_minutes` (od početka termina, pa pomeranje ne menja ništa).
Čekanje popunjava samo salon: `AvailabilityService::isFreeForSalon()` / `slots(..., salon: true)` računaju samo delove rada (`workIntervals()`),
online i `isFree()` ceo termin. Kalendar crta čekanje prugasto („Čeka · slobodno“, klik = novi termin u tom vremenu), termin u čekanju se crta
preko njega (`event-nested`); `core/utils/processing.ts`. Pri prevlačenju kolone zaposlenih koji ne rade te usluge su označene i spuštanje se odbija.
Povezane usluge (dve prostorije): u `/book` „Odmah posle i druga usluga“ → lista ostalih usluga (`linked_service_ids`); `BookingService` pravi
povezan termin odmah posle prvog kod slobodnog zaposlenog (`AvailabilityService::linkedSegments()` — jedan zaposleni za sve ili po usluga,
`chainPlanner()` je jedino mesto za proveru niza, koristi ga i dostupnost), isti `appointments.link_group`, cena iz zajedničkog `quote`.
Klijent pomera grupu zajedno (`moveChainByClient`), a pri otkazivanju bira koje termine (`linked_ids`, podrazumevano svi); kasno otkazivanje
grupe je jedna naknada. Prekidač `linked_booking_enabled` (Podešavanja → Zakazivanje). Osoblje pomera i otkazuje termine pojedinačno.
Obaveštenja uživo (Pusher): `Realtime` servis (`PUSHER_*` u `.env`, bez njih ne radi ništa) šalje događaj `appointment` posle odgovora (`defer`)
na `private-salon` (osoblje) i `private-user-{id}` (klijent); poziva se samo iz `AppointmentNotifier` (i `changedSilently()` kad nema
poruke), potpis kanala `POST /realtime/auth`. Frontend `RealtimeService` (pusher-js se učitava lenjo, ključ iz `/public/business` → `realtime`)
prikazuje poruku (radnik vezan za zaposlenog samo za svoje, bez sopstvenih akcija) i podiže `version`, na koji kalendar, lista termina,
pregled i Moji termini tiho osvežavaju (`quiet` = bez globalnog loadera).
Centar obaveštenja (zvonce): `inbox_notifications` (po korisniku, `read_at`, briše se posle 180 dana `model:prune`); upisuje ga samo
`Inbox::deliver($users, $notification)` preko `toInbox()` u klasi obaveštenja (naslov, tekst, relativan `link`), nezavisno od mejla /
WhatsApp-a i prekidača obaveštenja, bez onoga ko je radnju uradio i bez klijenta bez naloga; termini: vlasnik i menadžeri
uvek, radnik samo za svog zaposlenog. Nova obaveštenja za korisnika idu kroz `toInbox()` + `Inbox`. Pusher događaj `inbox` na
`private-user-{id}` (osoblje sluša i taj kanal); frontend `InboxService` + `<app-inbox-bell>` (zaglavlje, a na desktopu admina u bočnom
meniju): Nepročitano / Sve, klik označava pročitano i vodi na `link`, „Označi sve kao pročitano“, „Sva obaveštenja“ → stranica
`/admin/notifications` (osoblje) / `/notifications` (klijent), `NotificationsPageComponent`: po danima, „Prikaži starija“, sopstveno stanje (`InboxService.page()`).
Poruke sa klijentima (chat) su **teme**: `chat_sessions` (klijent, `subject`, opciono termin, `closed_at` — otvorena dok je neko ne završi,
`expires_at` se više ne koristi; `assigned_to` = ko je prvi odgovorio), `chat_messages`, `chat_reads` (`last_read_message_id` po korisniku); pravila samo u
`ChatService` (klijent šalje u temu `session_id`, ili otvara novu sa `subject`, a o terminu nastavlja otvorenu temu tog termina; odgovor ponovo otvara
završenu; vlasnik i menadžer vide sve teme i učesnike (`participants`), radnik teme o svojim terminima i one u kojima je pisao / koje je otvorio;
nepročitano za osoblje = poruke klijenta). Pusher događaj `chat` na `private-user-{id}`; `chat:notify-unread` (na 5 min) šalje
klijentu mejl / WhatsApp za poruke salona nepročitane 15 min (`notified_at`). Prekidač `chat_enabled` (podrazumevano uključen, Podešavanja →
Zakazivanje). Frontend: `ChatService`, `<app-chat-thread>` (deljen prikaz i unos), klijent `<app-chat-widget>` (dugme dole desno u javnoj
školjci, „Poruka salonu“ na terminu, `?chat=1`), osoblje `/admin/chat` (Aktivni / Završeni, `?session=` ili `?client=&appointment=&name=` za
novu poruku iz detalja termina). Uslove nad spojenim tabelama ne pisati kao `whereRaw` sa imenima tabela — lokalna i produkciona baza imaju
prefiks `zk_`, a testovi (SQLite) nemaju.
PWA i push na telefon: manifest `GET /api/public/manifest.webmanifest` i ikonica `GET /api/public/app-icon/{180|192|512}.png` (iz logoa salona,
pozadina = boja ugla logoa; bez logoa početno slovo na primarnoj boji), `frontend/public/sw.js` (push → obaveštenje + `setAppBadge`, klik otvara
`link`). Web Push sa sopstvenim VAPID ključevima (`WEBPUSH_*` u `.env`, `minishlink/web-push`), `push_subscriptions` po uređaju;
`WebPushService::toUser()` šalju samo `Inbox::deliver()` i `ChatService` (broj na ikonici = nepročitano u zvoncetu + chat). Frontend
`PushService` (registracija SW, pretplata, `setAppBadge`, instalacija) i `<app-device-notifications>` u oba profila + poziv u zvoncetu; na iPhone-u
samo posle „Dodaj na početni ekran“. Odjava šalje `push_endpoint` i briše pretplatu tog uređaja. Lokalno na Windows-u OpenSSL traži
`OPENSSL_CONF` — `ServeCommand` ga postavlja iz `extras/ssl/openssl.cnf` pri `php artisan serve`.
Lokalno: `node dev.mjs` (frontend 4200 / 5110, backend 8000 / 8110).
Specifikacija: `docs/specifikacija.md`; API rute: `docs/api-rute.md` (ažurirati pri izmeni ruta);
radni tok: `docs/git-workflow.md`; deploy: `docs/DEPLOY.md`; predaja salonu (nalozi, troškovi, novi domen): `docs/predaja/`.
