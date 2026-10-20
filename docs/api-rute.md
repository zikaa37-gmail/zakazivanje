# API rute

Osnova: `/api`. Zaštićene rute traže `Authorization: Bearer <access_token>`.

## Javno

| Metoda | Ruta | Opis |
| --- | --- | --- |
| GET | `/health` | provera da backend radi |
| GET | `/public/business` | podaci o biznisu (naziv, delatnost, kontakt, logo) |
| POST | `/auth/register` | registracija klijenta → mejl za potvrdu |
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
| PUT | `/business-settings` | izmena podataka o biznisu |
