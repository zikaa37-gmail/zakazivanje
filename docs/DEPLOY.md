# Deploy na cPanel (zakazivanje.fiskultura.rs)

> Deploy se radi **samo kad se eksplicitno zatraži**.

Isti obrazac kao `D:\Playground\Angular\kosarkaska-evidencija\docs\DEPLOY.md` (a ona
`pravni-predmeti`) — tamo je pun postupak (nema SSH pristupa, `composer install` se radi lokalno,
`.exe` fajlovi iz `vendor/` se brišu pre zip-ovanja zbog antivirus skenera). Ovde su samo vrednosti
specifične za ovu aplikaciju.

## Specifično za ovu aplikaciju

- **Poddomen**: `zakazivanje.fiskultura.rs` (napravljen u cPanel-u).
- **Mejl pošiljaoca**: `zakazivanje@fiskultura.rs` (napravljen u cPanel-u) — SMTP `mail.fiskultura.rs`,
  port 465 (SSL). Lozinka ide samo u `deploy/.env`.
- **DB_PREFIX**: `zk_`.
- **Baza**: deljena baza `fiskultu_porucivanje` (isti nalog kao ostale aplikacije), razdvojena
  isključivo preko `DB_PREFIX=zk_`.
- **Folderi na serveru**:
  ```
  ~/zakazivanje.fiskultura.rs/   <- document root poddomena (javno dostupno)
    index.php                    <- iz deploy/index.php
    .htaccess                    <- iz deploy/htaccess-production
    index.html, *.js, *.css      <- Angular build (frontend/dist/zakazivanje/browser/*)

  ~/zakazivanje_app/             <- Laravel aplikacija, NIJE javno dostupna
    app/ bootstrap/ config/ database/ resources/ routes/ vendor/ storage/
    .env
    artisan
  ```
- **Slike** (logo biznisa, avatar): base64 u bazi, bez `storage:link`.

## Stanje na serveru

- **Prvi deploy: 21.10.2026.** (`python deploy/deploy.py --with-db`) — demo podaci iz lokalne baze
  (Salon Lepota, 3 zaposlena, 5 usluga, akcije, admin `zakazivanje@fiskultura.rs`, test klijent).
  `.htaccess` u korenu poddomena = cPanel blok (PHP log) + `deploy/htaccess-production`; prethodna
  verzija je `.htaccess.bak`. FTP i baza su isti nalog kao `kosarkaska-evidencija`.
- Sledeći deploy-i idu **bez** `--with-db` dok se ne dogovori drugačije (server će imati prave termine).
- Mejl (`zakazivanje@fiskultura.rs`) i cron rade od 21.10.2026.
- Na `/login` su dugmad za brzu prijavu (Admin / Klijent) — ukloniti iz `frontend/src/environments/environment.ts` pre pravih klijenata.

## Prvi deploy (jednom)

1. `deploy/env.production.example` → kopiraj u `deploy/.env` i popuni: FTP pristup, `DEPLOY_SECRET`
   (nasumičan string), `APP_KEY` (`php artisan key:generate --show`), `JWT_SECRET`
   (`php -r "echo bin2hex(random_bytes(32));"`), `DB_USERNAME`/`DB_PASSWORD` (deljena baza),
   `MAIL_PASSWORD`.
2. `python deploy/deploy.py --with-db` — build, upload, raspakivanje i uvoz baze.
3. **Odmah** promeni lozinku admin naloga (seed lozinka je `password`) ili napravi pravi admin nalog
   i obriši test naloge.
4. `index.php` i `.htaccess` iz `deploy/` otpremi u koren poddomena (FTP / File Manager).
5. **Trajni cron (obavezan)** — cPanel → Cron Jobs:
   ```
   * * * * * /usr/local/bin/php /home/fiskultu/zakazivanje_app/artisan schedule:run >> /dev/null 2>&1
   ```
   Pokreće: red poslova (`queue:work`, svaki minut — mejlovi i WhatsApp idu kroz red,
   `QUEUE_CONNECTION=database`), podsetnike (`appointments:send-reminders`, na 15 min) i dopunu
   ponavljajućih termina (`appointments:extend-recurring`, 02:00). Bez crona se obaveštenja ne šalju.
6. WhatsApp (opciono): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` u `deploy/.env`.
   Bez njih se WhatsApp poruke beleže kao „preskočeno" (Podešavanja → Obaveštenja → Dnevnik slanja).

## Sledeći deploy-i

```bash
python deploy/deploy.py               # build (sa testovima) + upload + raspakivanje + migrate
python deploy/deploy.py --skip-tests  # bez backend testova
python deploy/deploy.py --skip-build  # samo upload postojećih paketa
```

Kad server ima prave podatke (klijenti, termini), **ne koristiti `--with-db`** — prepisuje sve `zk_`
tabele lokalnim podacima. Skripta na serveru posle raspakivanja pokreće `php artisan migrate --force`,
pa nove migracije stižu same. Tabele sa podacima sa servera upisati u `KEEP_SERVER_DATA` u
`deploy/build-database.py`.

Paket bez upload-a: `bash deploy/build-release.sh` → `deploy/zakazivanje-app.zip`,
`deploy/zakazivanje-web.zip`, `deploy/zakazivanje-baza.sql` (sve van gita).

## Instagram (opciono)

Dugme „Poveži sa Instagramom" (Podešavanja → Instagram i Meta) radi kad postoji Meta aplikacija:

1. developers.facebook.com → Create app → tip „Business" → dodaj proizvod **Instagram** → „API setup with Instagram login".
2. U „Business login settings" upiši redirect URL: `https://zakazivanje.fiskultura.rs/api/public/instagram/callback`.
3. U „App roles → Roles" dodaj Instagram nalog salona kao **Instagram Tester** i prihvati poziv u Instagram aplikaciji
   (Podešavanja → Aplikacije i veb-sajtovi → Pozivi testera). Za jedan salon je dovoljan razvojni režim.
4. U `deploy/.env`: `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` (Instagram app ID / secret iz istog ekrana) i opciono
   `INSTAGRAM_REDIRECT_URI` (ako se razlikuje od podrazumevanog).

Bez ovih ključeva ostaje ručno lepljenje tokena. Token se obnavlja `instagram:refresh-token` (ponedeljkom 04:00).

## Provera

- `https://zakazivanje.fiskultura.rs/` učitava aplikaciju.
- `https://zakazivanje.fiskultura.rs/api/health` vraća `{"status":"ok"}`.
- Registracija novog klijenta šalje mejl sa `zakazivanje@fiskultura.rs`.

## Bezbednost

Ne upisivati stvarne `DB_PASSWORD`/`JWT_SECRET`/`MAIL_PASSWORD` nigde u repo. `deploy/.env` je van
gita (`.gitignore`).
