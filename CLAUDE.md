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
bez brisanja, lista čekanja. Radnik bez zaposlenog je administrativni radnik (Zaposleni → Nalozi za prijavu, `/admin/team`) i radi umesto
vlasnika: `User::isManager()` (vlasnik ili administrativni radnik) — zaposleni, usluge, cene, recenzije, galerija, podeli,
nalozi, podešavanja, brisanje klijenata i zone. Samo vlasniku ostaju finansijska statistika (`dashboard/stats`, `dashboard/sources`)
i nalozi vlasnika (administrativni radnik ne pravi, ne menja i ne briše vlasnika). Rute: `role:owner,worker` za svakodnevni rad,
`role:manager` za upravljanje, `role:owner` za finansije; frontend `staffGuard` / `managerGuard`, meni po `managerOnly`;
vlasnik i administrativni radnik imaju meni u dva taba, Svakodnevno i Upravljanje (`section` u `AdminShellComponent`).
Administrativni radnik izveštaje samo šalje vlasniku (`/reports/send`), ne vidi ih (`/reports`, `/reports/pdf` → 403) i ne dobija
automatske. Naplata: `appointments.tip` (bakšiš, nije prihod); izveštaj računa naplaćeno za sve neotkazane termine sa `paid_at`.
Svaki zaposleni sa emailom automatski ima nalog radnika (`StaffAccountService::sync()`);
zaposleni se ne briše nego deaktivira (`POST /staff/{id}/active`, termini i statistika ostaju na njegovom imenu). Nove uloge idu u `User::ROLES`.

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

Sve odjednom: `node dev.mjs` iz korena (frontend http://localhost:5110, backend http://127.0.0.1:8110, `/api` ide preko
`frontend/proxy.conf.json`; na lokalu CORS pušta sve). Portovi 4200 i 8000 su rezervisani za druge projekte.

Backend (from `backend/`):

```bash
composer install
php artisan migrate --seed
php artisan serve --port=8110
```

Seed nalozi: vlasnik `zakazivanje@fiskultura.rs` / `zakazivanje2026`, administrativni radnik `radnik@fiskultura.rs` /
`radnik2026`, klijent Petar Petrović
`devtestzikaa@gmail.com` / `test`. Dugmad za brzu prijavu (Vlasnik / Administrativni radnik / Radnik (Jelena, `jelena@demo.zakazivanje.rs` / `radnik2026`, iz DemoDataSeeder-a) / Klijent) su na `/login` i lokalno i na serveru (`devLogins` u
`environment.ts` i `environment.development.ts`) — dok su podaci test; ukloniti pre pravih klijenata.

Frontend (from `frontend/`):

```bash
npm install
npm start
```

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
Lista čekanja (#49): `WaitlistEntry` (klijent, dan, opciono zaposleni, deo dana pre podne < 14:00 / popodne),
`WaitlistService::slotFreed*()` posle otkazivanja / pomeranja (admin i klijent) šalje `WaitlistNotification` svima
kojima sada postoji slobodan termin (najviše na 30 min), link `/book?services=&staff=&date=` otvara korak „Termin";
zakazivanje tog dana gasi prijavu. Pun dan je u `/book` isprekidan i može se izabrati; prekidač `waitlist_enabled`.
Usluge su na početnoj i u `/book` grupisane po kategoriji (`groupByCategory()` u `service.model.ts`, bez
kategorije → „Ostalo") sa filterom kategorija (`.chip-scroll`) — frizerske i kozmetičke usluge istog salona.
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
samo osoblju). Klijenta u formi termina bira deljena `<app-select-search>` (prima `FormControl`, `remote` pretraga).
Landing i Instagram (#65): početna je landing za sve (naslovna ili prva fotografija salona, ocena / danas radimo / grad / poziv, „Naš salon" slajder
(`gallery_images.kind = salon`), „Naši radovi" (`featured`, inače poslednji radovi), usluge, objave sa Instagrama, „Kako do nas" (Google mapa
iz `map_query` ili naziva i adrese, bez API ključa), utisci na dnu); neulogovanom „Zakaži termin" nudi prijavu / registraciju / pregled termina.
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
Stranice: `index.html` (uvod i kartice), `vlasnik.html` (vlasnik i administrativni radnik: prvo podešavanje i Upravljanje), `svakodnevni-rad.html`,
`radnik.html`, `klijent.html` (može da se pošalje klijentima) i `prijava-i-nalozi.html`; zajednički `uputstvo.css` i `uputstvo.js` (boje, naziv i logo
salona iz `GET /api/public/business`, uz neutralne podrazumevane boje). Svaki korak je `<details class="step">` sa `<span class="num">`, zatvoren osim prvog;
broj u tekstu (`<span class="badge">`) odgovara crvenoj oznaci na slici. Slike sa telefona (390×844) su u `slike/`. Ponovo se snimaju sa
`node docs/uputstvo/snimi-slike.js frontend/public/uputstvo/slike [ime1,ime2]` dok radi `node dev.mjs` (frontend 5110, backend 8110): skripta se prijavljuje
dugmićima za brzu prijavu, pravi privremenu akciju INSTA10, pauzu usluge i jedan termin klijenta, pa ih na kraju briše (`php artisan tinker`), a slike upisuje
tek na kraju (upis u `public/` usred snimanja bi osvežio aplikaciju). Posle izmena ekrana ažurirati uputstvo i slike; slika koju nijedna stranica ne koristi se briše.
PDF se pravi kad se potvrdi da je sve obuhvaćeno.
Potvrda termina po usluzi: `services.booking_confirmation` (bar jedna „ručno“ → čeka, sve „automatski“ → potvrđen, inače zaposleni pa salon;
`BookingService::confirmsAutomatically()`). Usluga se onemogućava (`active`) ili pauzira do datuma (`paused_until`: online se ne nudi do tog dana,
`AvailabilityService::pausedOn()`); briše se samo ako nikad nije zakazana. Kodovi za popust: `promotions.code` (+ `max_uses`, `once_per_client`),
akcija sa kodom važi samo uz `promo_code` pri zakazivanju (`PriceQuoteService::quote`), upotreba se broji preko `appointment_items.promotion_id`;
šabloni praznika u `core/utils/promo-presets.ts`, `/book?kod=`. Naplata beleži bakšiš (`appointments.tip`). Registracija: nalog klijenta je aktivan
tek posle linka iz mejla (`email_verification_sent_at`, važi `User::VERIFICATION_DAYS` = 3, link prijavljuje i vraća na `next`); ponovna registracija
nepotvrđenog mejla ažurira nalog i šalje novi link; zaštita od botova: polje `website` i `started_at` (< 3 s). Beleške osoblja (`staff_notes`,
`staff_note_recipients`): status novo / preuzeto (`taken_by`) / urađeno, pročitano po primaocu, obaveštenje izabranima + uvek
`business_settings.note_always_notify_ids` (podrazumevano vlasnici i administrativni radnici). Zaposleni mora imati email i telefon.
Lokalno: `node dev.mjs` (frontend 5110, backend 8110).
Specifikacija: `docs/specifikacija.md`; API rute: `docs/api-rute.md` (ažurirati pri izmeni ruta);
radni tok: `docs/git-workflow.md`; deploy: `docs/DEPLOY.md`.
