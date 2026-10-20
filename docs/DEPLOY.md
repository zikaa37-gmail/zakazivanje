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

## Prvi deploy (jednom)

1. `deploy/env.production.example` → kopiraj u `deploy/.env` i popuni: FTP pristup, `DEPLOY_SECRET`
   (nasumičan string), `APP_KEY` (`php artisan key:generate --show`), `JWT_SECRET`
   (`php -r "echo bin2hex(random_bytes(32));"`), `DB_USERNAME`/`DB_PASSWORD` (deljena baza),
   `MAIL_PASSWORD`.
2. `python deploy/deploy.py --with-db` — build, upload, raspakivanje i uvoz baze.
3. **Odmah** promeni lozinku admin naloga (seed lozinka je `password`) ili napravi pravi admin nalog
   i obriši test naloge.
4. `index.php` i `.htaccess` iz `deploy/` otpremi u koren poddomena (FTP / File Manager).
5. Kad aplikacija dobije zakazane komande (podsetnici za termine), dodaj trajni cron:
   ```
   * * * * * /usr/local/bin/php /home/fiskultu/zakazivanje_app/artisan schedule:run >> /dev/null 2>&1
   ```

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

## Provera

- `https://zakazivanje.fiskultura.rs/` učitava aplikaciju.
- `https://zakazivanje.fiskultura.rs/api/health` vraća `{"status":"ok"}`.
- Registracija novog klijenta šalje mejl sa `zakazivanje@fiskultura.rs`.

## Bezbednost

Ne upisivati stvarne `DB_PASSWORD`/`JWT_SECRET`/`MAIL_PASSWORD` nigde u repo. `deploy/.env` je van
gita (`.gitignore`).
