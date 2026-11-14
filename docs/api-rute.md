# API rute

Osnova: `/api`. Zaštićene rute traže `Authorization: Bearer <access_token>`.

## Javno

| Metoda | Ruta | Opis |
| --- | --- | --- |
| GET | `/health` | provera da backend radi |
| GET | `/public/business` | podaci o biznisu (naziv, delatnost, kontakt, logo, boje teme, režim potvrde) + `opening_hours` (radno vreme salona) i `shifts` (smene) |
| GET | `/public/business/cover` | naslovna fotografija salona (fajl, keš 7 dana; `cover_url` u `/public/business`) |
| GET | `/public/services` | usluge koje se nude online (aktivne, u aktivnoj kategoriji), poređane po redosledu kategorija, sa `category` (naziv) i zaposlenima koji ih rade |
| GET | `/public/reviews` | `{enabled, summary: {average, count, distribution}, items}` — vidljive recenzije (ime skraćeno: „Petar P.“), poslednjih 30 |
| GET | `/public/gallery` | vidljive slike galerije `[{id, caption, service_id, service_name, kind: work|salon, featured, width, height, url}]` (bez sadržaja slike) |
| GET | `/public/instagram-media/{token}` | JPEG slika objave koju Instagram preuzima pri objavljivanju (token od 40 znakova) |
| GET | `/public/instagram` | poslednje objave sa povezanog Instagram naloga `[{id, caption, type, image, permalink, posted_at}]` (keš 1 h; prazno bez tokena ili kad je prikaz isključen) |
| POST | `/public/visit` | `{source, campaign?}` — beleži posetu po izvoru (`?izvor=` / `?source=` / `utm_source`, `&kampanja=`); osoblje se ne broji. `login`, `register` i `bookings` primaju `referral: {source, campaign}` |
| GET | `/public/reports/{file}` | potpisan link (7 dana) na PDF izveštaja poslat preko WhatsApp-a |
| GET | `/public/gallery/images/{id}` | sama slika (keš 7 dana; `?v=` se menja pri izmeni) |
| POST | `/availability/days` | `{service_ids, staff_member_id?, from, days?, linked_service_ids?}` → `[{date, available, open}]` (`open` = neko tog dana radi — pun dan je `open` ali ne `available`) |
| POST | `/availability/slots` | `{service_ids, staff_member_id?, date, ignore_appointment_id?, linked_service_ids?}` (sopstveni termin prijavljenog klijenta se ne računa kao zauzet; uz `linked_service_ids` samo vremena posle kojih je povezana usluga odmah slobodna kod nekog zaposlenog; za `ignore_appointment_id` iz povezane grupe server sam dodaje ostale termine grupe) → `[{time, staff_member_ids}]` (radno vreme − zauzeti termini − blokade, pravila iz Podešavanja) |
| POST | `/bookings/quote` | cena sa akcijama (za prijavljenog klijenta računa i loyalty / N+M); `promo_code?` → `code_applied`, `code_error`; `linked_service_ids?` ulaze u cenu |
| POST | `/bookings` | `{service_ids, staff_member_id?, starts_at "Y-m-d H:i", note?, promo_code?, linked_service_ids?, guest?}` — gost: `{first_name, last_name, phone, email?}`; `null` zaposleni = prvi slobodan; `linked_service_ids` = povezani termin(i) odmah posle, kod slobodnog zaposlenog, isti `link_group` (vraća `linked`; uz `linked_booking_enabled`) |
| POST | `/auth/register` | registracija klijenta → mejl za aktivaciju (važi 3 dana; `next?` = povratak posle aktivacije; ponovna registracija nepotvrđenog mejla šalje novi link; `website` i `started_at` su zaštita od botova) |
| POST | `/auth/login` | `{email, password}` → `{access_token, refresh_token, user}` |
| GET | `/auth/quick-logins` | brza prijava (test): `[{email, label}]` za mejlove iz `QUICK_LOGIN_EMAILS`; prazno = isključeno |
| POST | `/auth/quick-login` | `{email}` → tokeni, samo za mejl sa liste (inače 404) |
| POST | `/auth/refresh` | `{refresh_token}` → novi par tokena (stari se opoziva) |
| POST | `/auth/verify-email` | `{token}` iz linka u mejlu → aktivira nalog i vraća `{access_token, refresh_token, user}` |
| POST | `/auth/resend-verification` | `{email, next?}` |
| POST | `/auth/forgot-password` | `{email}` → mejl sa linkom `/reset-password?token=&email=` |
| POST | `/auth/reset-password` | `{token, email, password, password_confirmation}` |

Ograničenja (imenovani limiteri, `AppServiceProvider`): `auth` 10/min, `booking` 10/min, `public` 240/min — svaki ima svoj brojač.
`/availability/*`, `/bookings*` primaju i opcioni token (`jwt.optional`).

## Prijavljen korisnik (`jwt`)

| Metoda | Ruta | Opis |
| --- | --- | --- |
| GET | `/auth/me` | trenutni korisnik |
| POST | `/realtime/auth` | `{socket_id, channel_name}` — Pusher potpis za privatni kanal (`private-salon` za osoblje, `private-user-{id}` za sebe); 404 bez ključeva |
| PUT | `/auth/profile` | ime, prezime, telefon, WhatsApp, kanal obaveštenja; klijent i `gender`, `favorite_staff_member_id` (osoblju se ignorišu); radniku vezanom za zaposlenog ime i telefon dolaze sa stranice Zaposleni i ne menjaju se ovde |
| POST | `/auth/change-password` | `{current_password, password, password_confirmation}` |
| PUT | `/auth/favorite-staff` | `{staff_member_id \| null}` — omiljeni frizer klijenta (aktivan zaposleni) |
| POST | `/auth/logout` | `{refresh_token}` |
| POST | `/my-appointments/list` | `{scope: upcoming \| past}` → termini sa `can_cancel`, `can_reschedule`, `late_cancel` |
| POST | `/my-appointments/{id}/reschedule` | `{starts_at, staff_member_id?}` — klijent pomera termin (povezana grupa se pomera cela, `starts_at` važi za prvi termin) (isti rok kao otkazivanje, pravila online zakazivanja; `null` zaposleni = prvo trenutni, pa bilo ko); u ručnom režimu termin ponovo čeka potvrdu; salonu mejl sa starim vremenom |
| POST | `/my-waitlist/list`, `/my-waitlist` | lista čekanja klijenta / prijava `{service_ids, staff_member_id?, date, part: any \| morning \| afternoon}` (jedna po danu) |
| DELETE | `/my-waitlist/{id}` | odjava |
| POST | `/my-appointments/{id}/review` | `{rating 1–5, comment?}` — samo završen termin; izmena do 30 dana |
| POST | `/my-appointments/{id}/payment` | IPS podaci za uplatu `{amount, account, payee, payment_code, model, reference, purpose, payload, qr}` — samo ako je uključeno plaćanje unapred |
| POST | `/my-appointments/{id}/slip` | PDF uplatnica |
| POST | `/my-appointments/{id}/cancel` | `{accept_late?, linked_ids?}` — otkazivanje (`linked_ids` = i ti termini iz iste povezane grupe; vraća `cancelled_ids`, kasno otkazivanje grupe je jedna naknada) (do roka iz `cancellation_days_before`; 1 = najkasnije dan pre termina). Uz `cancellation_fee_enabled` i posle roka do početka, ali samo uz `accept_late: true`; vraća `cancellation_fee` |
| POST | `/my-appointments/{id}/cancel-preview` | `{linked_ids?}` → `{late, free, number, free_total, free_left_after, next_amount, amount, note, deadline_label}` — odbrojavanje i naknada pre kasnog otkazivanja |
| GET | `/my-cancellation-status` | `{enabled, free_total, used, free_left, window_days, exempt, open_amount, note}` |

## Osoblje (`jwt` + `role:owner,worker`)

Vlasnik i radnik — svakodnevni rad.

| Metoda | Ruta | Opis |
| --- | --- | --- |
| POST | `/staff/list` | zaposleni sa uslugama i radnim vremenom |
| POST | `/services/list` | sve usluge (i neaktivne) |
| POST | `/services/quote` | `{service_ids, date?, completed_visits?, completed_visits_by_service?}` → cena sa akcijama (`PriceQuoteService`) |
| POST | `/clients/list` | `{search?, page?, zone?}` → paginirano, `has_account`, `discipline_zone`, `discipline_points`, `zone_*` |
| POST | `/clients/{id}/activity` | `{before_id?}` → `{client, stats (termini, otkazivanja, nedolasci, pouzdanost), logs (100, najnoviji prvi), has_more}` |
| POST / PUT | `/clients`, `/clients/{id}` | klijenti (i bez naloga — telefonski) |
| POST | `/appointments/list` | `{from, to, staff_member_id?, status?, search?}` |
| POST | `/appointments/pending-count` | broj budućih termina na čekanju |
| POST | `/appointments` | salon zakazuje: `{client_id, service_ids, staff_member_id, starts_at, note?, admin_note?, recurrence?: {interval_weeks 1–4, count? \| ends_on?}}` → `{appointments, skipped}` |
| POST | `/appointments/{id}/status` | `pending`, `confirmed`, `completed`, `cancelled`, `no_show` |
| POST | `/appointments/{id}/cancel` | `{scope: this \| series, by_client?}` (`by_client` = klijent je otkazao preko salona, računa se u disciplinu) — `series` otkazuje ovaj i sve sledeće i zaustavlja ponavljanje |
| POST | `/recurrences/list` | aktivna ponavljanja |
| POST | `/appointments/{id}/reschedule` | `{staff_member_id, starts_at, notify?}` — pomeranje (provera zauzetosti i da zaposleni radi usluge), klijent dobija obaveštenje; promena zaposlenog = prebacivanje (`free_change_reason = transferred`, obaveštenje klijentu, oba zaposlena, vlasniku i administrativnim radnicima) |
| GET | `/appointments/{id}/linked` | ostali aktivni termini iste povezane grupe |
| GET | `/appointments/{id}/alternatives` | kolege koje rade te usluge i slobodne su u isto vreme |
| POST | `/appointments/{id}/ask-reschedule` | klijentu poruka sa linkom `/my-appointments?reschedule={id}`; `free_change_reason = salon_request` (pomeranje / otkazivanje bez roka i bez poena discipline) |
| POST | `/reports` | `{period: day \| week \| month, date, staff_member_id?}` → izveštaj (zbirni ili po zaposlenom): `totals`, `staff`, `days`, `services`, `appointments` (dan, i nedelja po zaposlenom); radnik dobija samo svoj; administrativni radnik vidi samo svoj (ako radi usluge), ostale samo šalje |
| POST | `/reports/pdf` | isti upit → PDF |
| POST | `/reports/send` | isti upit + `{channel: mail \| whatsapp}` → PDF prijavljenom korisniku; administrativni radnik šalje vlasnicima |
| POST / DELETE | `/blocked-times/list`, `/blocked-times`, `/blocked-times/{id}` | blokade vremena (zaposleni ili ceo salon) |
| POST | `/staff-absences/list` | `{status?, include_past?}` — odsustva (radnik koji radi usluge vidi svoja i ona koja je upisao) |
| POST | `/staff-absences` | `{staff_member_id, starts_on, ends_on, type: sick\|vacation\|other, note?}` — upisuje bilo ko iz osoblja; vlasnik / administrativni radnik → odmah odobreno (blokada celih dana), inače čeka i oni dobijaju obaveštenje |
| GET | `/staff-absences/{id}/appointments` | termini zaposlenog u periodu, sa telefonom klijenta i `alternatives` (slobodne kolege) |
| DELETE | `/staff-absences/{id}` | uklanja odsustvo i blokadu (menadžer, ili onaj ko je upisao dok čeka) |
| POST | `/cancellation-fees/list` | `{client_id?, status?: free\|open\|paid\|waived}` — naknade za kasno otkazivanje |
| GET | `/clients/{id}/cancellation-status` | odbrojavanje i dug klijenta (kao `/my-cancellation-status`) |
| GET | `/appointments/{id}/cancel-preview` | šta bi „Klijent otkazao“ sada upisao (`/appointments/{id}/cancel` sa `by_client` upisuje naknadu) |
| POST | `/cancellation-fees/{id}/paid` | `{payment_method: cash\|card\|bank}` — naknada naplaćena |
| POST | `/cancellation-fees/{id}/waive`, `/cancellation-fees/{id}/adjust` | `{reason}` / `{amount, reason}` — samo vlasnik / administrativni radnik |
| POST | `/staff-absences/pending-count`, `/staff-absences/{id}/approve`, `/staff-absences/{id}/reject` | samo vlasnik / administrativni radnik; zaposleni dobija obaveštenje |
| POST | `/appointments/{id}/payment`, `/appointments/{id}/slip` | IPS QR / PDF uplatnica (i bez uključenog plaćanja unapred) |
| POST | `/appointments/{id}/paid` | `{method: cash \| card \| bank \| null}` — naplaćeno (`paid_at`) ili poništeno |
| POST / DELETE | `/waitlist/list`, `/waitlist/{id}` | aktivne prijave na listu čekanja |
| POST | `/dashboard/today` | `{date?, staff_member_id?}` (radnik uvek svoj) → termini dana, sledeći termin, zahtevi na čekanju, ko radi i očekivani prihod |

## Vlasnik (`jwt` + `role:owner`)

| Metoda | Ruta | Opis |
| --- | --- | --- |
| PUT | `/business-settings` | podaci o biznisu, logo (data URL), `theme_primary/secondary/tertiary`, `booking_confirmation` (`manual` / `automatic`), `staff_term` + `staff_term_genitive` (kako se zovu zaposleni: „Tvoj frizer“ / „kod tvog frizera“), `ai_enabled` (samo uz sačuvan API ključ) |
| POST / PUT | `/staff`, `/staff/{id}` | `service_ids`, `working_hours: [{weekday 1–7, starts_at, ends_at}]` (više smena po danu, bez preklapanja), `booking_confirmation` (`null` = kao biznis); sa `email` zaposleni automatski dobija nalog radnika (`users.staff_member_id`) |
| POST | `/staff/{id}/active` | `{active}` — deaktivacija umesto brisanja (termini i statistika ostaju, ne nudi se za zakazivanje, nalog radnika se gasi) → zaposleni + `future_appointments` |
| POST / PUT / DELETE | `/services`, `/services/{id}` | `duration_minutes`, `price`, `service_category_id`, `staff_member_ids`; odgovor nosi i `category` (naziv kategorije) |
| GET | `/service-categories` | kategorije po redosledu, sa `services_count` i `active_services_count` |
| POST / PUT | `/service-categories`, `/service-categories/{id}` | `{name}` (jedinstven) |
| POST | `/service-categories/{id}/active` | `{active}` — deaktivirana kategorija sakriva svoje usluge iz online zakazivanja (salon ih i dalje zakazuje) |
| DELETE | `/service-categories/{id}` | samo kategorija bez usluga |
| POST | `/service-categories/reorder` | `{ids}` — redosled na početnoj i u zakazivanju |
| POST | `/service-categories/apply` | `{categories: [{name, services: [{name, description?, duration_minutes, price?, audience?}]}], staff_member_ids?}` — dodaje predlog (šablon ili AI): postojeće kategorije (po nazivu) se koriste, postojeće usluge se preskaču, usluga bez cene je neaktivna → `{categories_created, services_created, services_skipped}` |
| GET | `/ai/status` | `{enabled, key_saved, key_from_server, available, model}` |
| PUT / DELETE | `/ai/key` | `{api_key}` — proverava ključ kod Anthropic-a i čuva ga šifrovano (`business_settings.ai_api_key`); bez ključa u bazi koristi se `ANTHROPIC_API_KEY` iz `.env` |
| POST | `/ai/service-suggestions` | `{description?}` → `{categories: [...]}` u formatu za `apply` (samo uz uključen AI) |
| POST | `/ai/staff-term` | `{category?, description?}` → `{options: [{term, genitive}]}` |
| POST | `/notes/list` | beleške osoblja: `status` (open / taken / done), `taken_by`, `readers`, `unread`, `can_delete` |
| POST | `/notes/recipients` | zaposleni za obaveštenje `[{user_id, name, role, staff_member_id, always}]` (`user_id: null` = nema nalog) |
| POST | `/notes` | `{body, recipient_ids}` → obaveštava izabrane + uvek-obaveštene (`note_always_notify_ids`) |
| POST | `/notes/unread-count`, `/notes/{id}/read`, `/notes/{id}/take`, `/notes/{id}/resolve` | nepročitane; pročitano; preuzimam (ponovo = otkaži); urađeno (ponovo = otvori) |
| DELETE | `/notes/{id}` | autor, vlasnik ili administrativni radnik |
| POST | `/promotions/list` | akcije |
| POST / PUT / DELETE | `/promotions`, `/promotions/{id}` | `type`: `discount_percent`, `discount_amount`, `package`, `bundle`, `loyalty` + polja tog tipa, `service_ids`, `starts_on`, `ends_on`, `weekdays`, `code?`, `max_uses?`, `once_per_client` (lista vraća i `uses`) |
| DELETE | `/clients/{id}` | brisanje klijenta |
| PUT | `/clients/{id}/zone` | `{zone: green \| yellow \| orange \| red \| null, reason?, until?}` — ručna zona (`null` = ponovo automatski po poenima) |
| POST | `/reviews/list` | `{rating?, staff_member_id?, visible?}` → `{summary, staff (prosek po zaposlenom), items}` |
| PUT | `/reviews/{id}` | `{visible?, reply?}` — sakrivanje sa sajta, odgovor salona |
| POST | `/share/qr` | `{url}` (http/https) → `{url, png (data URL), svg}` za štampu |
| POST | `/gallery/list` | sve slike galerije (i skrivene) |
| POST | `/gallery` | `{data (data URL JPG/PNG/WEBP, do ~4 MB), width, height, caption?, service_id?}` — jedna slika po pozivu, nova ide na početak |
| PUT / DELETE | `/gallery/{id}` | `{caption?, service_id?, kind?, featured?, visible?}` / brisanje |
| POST | `/gallery/reorder` | `{ids}` — redosled kao na ekranu |
| POST | `/dashboard/demand` | zauzetost po danu u nedelji i satu (poslednjih 90 dana) → `{has_history, buckets: [{weekday, hour, rate, off_peak}]}` — sati koji se nude klijentu u žutoj zoni |
| POST | `/dashboard/sources` | `{from, to}` → `{rows: [{source, campaign, visits, registrations, logins, bookings, new_clients, completed, revenue}], instagram: {available, reach, profile_views, website_clicks, accounts_engaged, total_interactions, top_posts} \| null}` (vlasnik; Instagram samo kad je povezan i uključena statistika, keš 1 h) |
| POST | `/instagram/authorize` | `{url}` — adresa za prijavu na Instagram (OAuth, vlasnik); posle odobrenja Instagram vraća na `GET /public/instagram/callback`, koji čuva dugotrajni token i preusmerava na `/admin/settings?tab=social&instagram=connected|error|cancelled` |
| POST | `/instagram/posts/list` | poslednjih 30 objava iz aplikacije `[{id, kind, source, caption, status, scheduled_at, published_at, permalink, error, slots, image_url}]` (vlasnik) |
| POST | `/instagram/posts` | `{kind: post\|story, caption?, image (data:image/jpeg), scheduled_at?}` — bez `scheduled_at` objavljuje odmah, inače čeka `instagram:publish-scheduled` (na 5 min); 422 dok objavljivanje nije uključeno (vlasnik) |
| POST / DELETE | `/instagram/posts/{id}/publish`, `/instagram/posts/{id}` | ponovni pokušaj neuspele / otkazivanje zakazane (objavljena se briše samo u Instagramu) |
| POST | `/instagram/free-slots/preview` | `{label, date, ranges: [{from, to}], image \| null}` — primer story-ja „Slobodni termini" za sutra (manje traženi slobodni termini, `DemandService`) |
| POST / DELETE | `/instagram/connect`, `/instagram` | `{token}` — proverava token na Instagramu i čuva ga šifrovano / prekid veze (vlasnik); `instagram:refresh-token` ga obnavlja ponedeljkom u 04:00 |
| POST | `/dashboard/stats` | `{from, to}` (najviše godinu dana) → `summary`, `previous` (prethodni period iste dužine), `series` po danu, `top_services`, `staff_utilization` |
| POST | `/notification-logs/list` | `{status?}` → poslednjih 100 slanja (tip, kanal, primalac, status) |
| POST | `/notifications/test` | `{channel: mail \| whatsapp}` → probna poruka trenutnom korisniku |
| POST | `/team/list` | nalozi osoblja (vlasnici i radnici) sa `staff_member`, `has_password` |
| POST / PUT / DELETE | `/team`, `/team/{id}` | `{first_name, last_name, email, phone?, role: owner \| worker, active?, send_invite?}` — administrativni radnik ili vlasnik; nalogu zaposlenog menjaju se samo `role` i `active`; mora ostati bar jedan aktivan vlasnik |
| POST | `/team/{id}/invite` | mejl sa linkom za postavljanje lozinke |
