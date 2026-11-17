# 7. Prelazak na novi domen i čista baza (radimo mi)

[← Predaja](README.md)

Test `zakazivanje.fiskultura.rs` ostaje za nas, za probe. Salon dobija **novu instalaciju**: drugi
hosting ili folder, sa svojom bazom i svojim ključevima. Ništa od test podataka ne prelazi.

## Šta treba doraditi u kodu pre predaje (zaseban PR)

- [ ] Komanda za prvog vlasnika na praznoj bazi, npr.
      `php artisan app:owner <mejl> --name="Ime Prezime"`. Ona šalje link za postavljanje lozinke, pa
      lozinka ne prolazi kroz nas.
      Sada `DatabaseSeeder` pravi test naloge (`zakazivanje@fiskultura.rs`, `radnik@fiskultura.rs`, test
      klijent), pa za pravog salona ne sme da se pokrene.
- [ ] Produkcioni start baze: `migrate --force` plus samo osnovni podaci:
  - `business_settings` sa nazivom salona;
  - podrazumevano radno vreme;
  - bez demo podataka.

  Opcija u `deploy.py`, npr. `--fresh-install`, umesto `--with-db` (koji šalje našu lokalnu bazu).
- [ ] `deploy/.env` po instalaciji, npr. `deploy/.env.salon-primer`, i izbor fajla pri deploy-u, da test i
      salon ne mešaju podešavanja.
- [ ] Proveriti da se nigde ne pojavljuje `fiskultura` kao naziv ili adresa salona. Naziv, logo i
      kontakt dolaze iz Podešavanja. Sada se pojavljuje samo u seed-u i u `deploy/env.production.example`.

## Koraci za instalaciju

1. **Hosting spreman** ([domen i hosting](02-domen-i-hosting.md)):
   - baza i korisnik baze;
   - mejl `obavestenja@`;
   - SSL;
   - FTP nalog.
2. **Novi `deploy/.env` za salon.** Kopirati `deploy/env.production.example` i promeniti:
   - `FTP_*`, `DEPLOY_APP_DIR` (Laravel van `public_html`) i `DEPLOY_WEB_DIR` (folder domena).
   - `DEPLOY_SECRET`: novi nasumičan string.
   - `APP_URL`, `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS` na `https://<domen-salona>`.
   - `APP_KEY` (`php artisan key:generate --show`) i `JWT_SECRET`: **novi**, nikad isti kao na testu.
   - `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`. `DB_PREFIX=zk_` može da ostane.
   - `MAIL_HOST` (mail server domena), `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS` i
     `MAIL_FROM_NAME` (naziv salona).
   - `WEBPUSH_PUBLIC_KEY` / `WEBPUSH_PRIVATE_KEY`: **novi VAPID par** za ovaj domen. Posle predaje se
     više nikad ne menja, jer bi time sve pretplate na telefonima prestale da rade.
     `WEBPUSH_SUBJECT=mailto:obavestenja@<domen>`.
   - `QUICK_LOGIN_EMAILS=`: **prazno**, da nema dugmadi za brzu prijavu.
   - Ključevi servisa koje salon koristi: [Pusher](05-pusher.md), [Twilio](04-whatsapp-twilio.md),
     [Instagram](06-instagram-meta.md), po želji `ANTHROPIC_API_KEY` ([AI](03-ai-anthropic.md)).
3. **Prvi deploy:** `python deploy/deploy.py` sa novim `.env`, pa čist start baze (vidi doradu iznad).
4. **Cron** u cPanel-u salona (obavezno):
   ```
   * * * * * /usr/local/bin/php /home/<korisnik>/<app-folder>/artisan schedule:run >> /dev/null 2>&1
   ```
5. **Vlasnik:** `app:owner` za vlasnika. Vlasnik postavi lozinku iz mejla, a ostalo radi u aplikaciji
   ([prvo podešavanje](08-prvo-podesavanje.md)).
6. **Provera:**
   - sajt i `/api/public/business` odgovaraju;
   - prijava vlasnika radi;
   - probni termin: stižu potvrda (mejl) i obaveštenje osoblju (zvonce i push);
   - podsetnik stiže posle crona;
   - zaduženi za test proveravaju i WhatsApp i Pusher ako su uključeni.
7. **Rezervne kopije:** u cPanel-u uključiti automatski backup baze. Pre svakog sledećeg deploy-a sa
   migracijama napraviti ručnu kopiju.
8. **Posle predaje:**
   - deploy salona samo na zahtev, nikad `--with-db`;
   - test sajt ostaje za probe pre deploy-a kod salona.
