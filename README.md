# Zakazivanje

Online zakazivanje termina za jedan biznis (salon, berbernica, ordinacija...).

- `frontend/` — Angular 20 + Tailwind 4
- `backend/` — Laravel 13 + MySQL (JWT, prefiks tabela `zk_`)
- `docs/` — specifikacija, API rute, radni tok, deploy
- `deploy/` — skripte za deploy na cPanel (`zakazivanje.fiskultura.rs`)

## Pokretanje

```bash
cd backend && composer install && cp .env.example .env && php artisan key:generate && php artisan migrate --seed && php artisan serve
cd frontend && npm install && npm start
```

Ili sve odjednom iz korena: `node dev.mjs` (ili `npm run dev` iz `frontend/`) — backend i frontend zajedno, Ctrl+C gasi oba.

Portovi: frontend 4200, backend 8000; ako je podrazumevani port zauzet (drugi projekat), frontend ide na 5110, a backend na 8110.
Dev server prosleđuje `/api` na backend (`frontend/proxy.conf.mjs` sam nalazi na kom portu radi), pa nema CORS-a.

Pre prvog push-a: `git config core.hooksPath .githooks` (blokira direktan push na `main`).
