# API rute

Osnova: `/api`. Zaštićene rute traže `Authorization: Bearer <access_token>`.

## Javno

| Metoda | Ruta | Opis |
| --- | --- | --- |
| GET | `/health` | provera da backend radi |
| GET | `/public/business` | podaci o biznisu (naziv, delatnost, kontakt, logo, boje teme, režim potvrde) |
| GET | `/public/services` | aktivne usluge sa zaposlenima koji ih rade |
| POST | `/availability/days` | `{service_ids, staff_member_id?, from, days?}` → `[{date, available}]` |
| POST | `/availability/slots` | `{service_ids, staff_member_id?, date}` → `[{time, staff_member_ids}]` (radno vreme − zauzeti termini − blokade, pravila iz Podešavanja) |
| POST | `/bookings/quote` | cena sa akcijama (za prijavljenog klijenta računa i loyalty / N+M) |
| POST | `/bookings` | `{service_ids, staff_member_id?, starts_at "Y-m-d H:i", note?, guest?}` — gost: `{first_name, last_name, phone, email?}`; `null` zaposleni = prvi slobodan |
| POST | `/auth/register` | registracija klijenta → mejl za potvrdu (preuzima klijenta kog je admin upisao bez naloga, isti email) |
| POST | `/auth/login` | `{email, password}` → `{access_token, refresh_token, user}` |
| POST | `/auth/refresh` | `{refresh_token}` → novi par tokena (stari se opoziva) |
| POST | `/auth/verify-email` | `{token}` iz linka u mejlu |
| POST | `/auth/resend-verification` | `{email}` |
| POST | `/auth/forgot-password` | `{email}` → mejl sa linkom `/reset-password?token=&email=` |
| POST | `/auth/reset-password` | `{token, email, password, password_confirmation}` |

Ograničenja (imenovani limiteri, `AppServiceProvider`): `auth` 10/min, `booking` 10/min, `public` 240/min — svaki ima svoj brojač.
`/availability/*`, `/bookings*` primaju i opcioni token (`jwt.optional`).

## Prijavljen korisnik (`jwt`)

| Metoda | Ruta | Opis |
| --- | --- | --- |
| GET | `/auth/me` | trenutni korisnik |
| PUT | `/auth/profile` | ime, prezime, telefon, WhatsApp, kanal obaveštenja |
| POST | `/auth/change-password` | `{current_password, password, password_confirmation}` |
| POST | `/auth/logout` | `{refresh_token}` |
| POST | `/my-appointments/list` | `{scope: upcoming \| past}` → termini sa `can_cancel` |
| POST | `/my-appointments/{id}/cancel` | otkazivanje (najkasnije `cancellation_hours` pre) |

## Admin (`jwt` + `role:admin`)

| Metoda | Ruta | Opis |
| --- | --- | --- |
| PUT | `/business-settings` | podaci o biznisu, logo (data URL), `theme_primary/secondary/tertiary`, `booking_confirmation` (`manual` / `automatic`) |
| POST | `/staff/list` | zaposleni sa uslugama i radnim vremenom |
| POST / PUT / DELETE | `/staff`, `/staff/{id}` | `service_ids`, `working_hours: [{weekday 1–7, starts_at, ends_at}]` (više smena po danu, bez preklapanja), `booking_confirmation` (`null` = kao biznis) |
| POST | `/services/list` | sve usluge (i neaktivne) |
| POST | `/services/quote` | `{service_ids, date?, completed_visits?, completed_visits_by_service?}` → cena sa akcijama (`PriceQuoteService`) |
| POST / PUT / DELETE | `/services`, `/services/{id}` | `duration_minutes`, `price`, `category`, `staff_member_ids` |
| POST | `/promotions/list` | akcije |
| POST / PUT / DELETE | `/promotions`, `/promotions/{id}` | `type`: `discount_percent`, `discount_amount`, `package`, `bundle`, `loyalty` + polja tog tipa, `service_ids`, `starts_on`, `ends_on`, `weekdays` |
| POST | `/clients/list` | `{search?, page?}` → paginirano, `has_account` |
| POST / PUT / DELETE | `/clients`, `/clients/{id}` | klijenti (i bez naloga — telefonski) |
| POST | `/appointments/list` | `{from, to, staff_member_id?, status?, search?}` |
| POST | `/appointments/pending-count` | broj budućih termina na čekanju |
| POST | `/appointments` | admin zakazuje: `{client_id, service_ids, staff_member_id, starts_at, note?, admin_note?, recurrence?: {interval_weeks 1–4, count? \| ends_on?}}` → `{appointments, skipped}` |
| POST | `/appointments/{id}/status` | `pending`, `confirmed`, `completed`, `cancelled`, `no_show` |
| POST | `/appointments/{id}/cancel` | `{scope: this \| series}` — `series` otkazuje ovaj i sve sledeće i zaustavlja ponavljanje |
| POST | `/recurrences/list` | aktivna ponavljanja |
| POST / DELETE | `/blocked-times/list`, `/blocked-times`, `/blocked-times/{id}` | blokade vremena (zaposleni ili ceo salon) |
