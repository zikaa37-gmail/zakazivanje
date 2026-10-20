# SQL — tabele po fajlovima

Po jedan fajl za svaku `zk_` tabelu (`zk_users.sql`, `zk_business_settings.sql`…): `DROP` + `CREATE`
po trenutnoj šemi i podaci iz lokalne dev baze. Svaki fajl može samostalno da se importuje
(phpMyAdmin → Import) kad treba osvežiti samo jednu tabelu.

Fajlove pravi `deploy/build-database.py` (poziva ga i `bash deploy/build-release.sh`) iz lokalne
MySQL baze iz `backend/.env`, posle `php artisan migrate`. Ne menjati ručno — regenerisati.

Tehničke tabele (keš, sesije, poslovi, refresh tokeni, reset lozinki) su samo šema.

Za deploy se ne koriste pojedinačni fajlovi nego jedan migracioni fajl
`deploy/zakazivanje-baza.sql` (ista skripta ga pravi) — postupak je u `docs/DEPLOY.md`.

Prefiks tabela je `zk_` (`DB_PREFIX`), jer je baza na hostingu deljena sa drugim aplikacijama.
