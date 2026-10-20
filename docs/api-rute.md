# API rute

Osnova: `/api`. Zaštićene rute traže `Authorization: Bearer <access_token>`.

## Javno

| Metoda | Ruta | Opis |
| --- | --- | --- |
| GET | `/health` | provera da backend radi |
| GET | `/public/business` | podaci o biznisu (naziv, delatnost, kontakt, logo, boje teme, režim potvrde) |
| GET | `/public/services` | aktivne usluge sa zaposlenima koji ih rade |
| POST | `/auth/register` | registracija klijenta → mejl za potvrdu (preuzima klijenta kog je admin upisao bez naloga, isti email) |
| POST | `/auth/login` | `{email, password}` → `{access_token, refresh_token, user}` |
| POST | `/auth/refresh` | `{refresh_token}` → novi par tokena (stari se opoziva) |
| POST | `/auth/verify-email` | `{token}` iz linka u mejlu |
| POST | `/auth/resend-verification` | `{email}` |
| POST | `/auth/forgot-password` | `{email}` → mejl sa linkom `/reset-password?token=&email=` |
| POST | `/auth/reset-password` | `{token, email, password, password_confirmation}` |

Auth rute (osim refresh-a) su ograničene na 10 zahteva u minutu.

## Prijavljen korisnik (`jwt`)

| Metoda | Ruta | Opis |
| --- | --- | --- |
| GET | `/auth/me` | trenutni korisnik |
| PUT | `/auth/profile` | ime, prezime, telefon, WhatsApp, kanal obaveštenja |
| POST | `/auth/change-password` | `{current_password, password, password_confirmation}` |
| POST | `/auth/logout` | `{refresh_token}` |

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
