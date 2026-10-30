# Zakazivanje

Online zakazivanje termina za jedan biznis (salon, berbernica, ordinacija...).

- `frontend/` — Angular 20 + Tailwind 4
- `backend/` — Laravel 13 + MySQL (JWT, prefiks tabela `zk_`)
- `docs/` — specifikacija, API rute, radni tok, deploy
- `deploy/` — skripte za deploy na cPanel (`zakazivanje.fiskultura.rs`)

## Pokretanje

```bash
cd backend && composer install && cp .env.example .env && php artisan key:generate && php artisan migrate --seed && php artisan serve --port=8110
cd frontend && npm install && npm start
```

Ili sve odjednom iz korena: `node dev.mjs` (ili `npm run dev` iz `frontend/`) — backend i frontend zajedno, Ctrl+C gasi oba.

Frontend: http://localhost:5110, API: http://127.0.0.1:8110/api. Dev server prosleđuje `/api` na backend
(`frontend/proxy.conf.json`), pa frontend radi na bilo kom portu (`npx ng serve --port 5199`) bez CORS-a.

Pre prvog push-a: `git config core.hooksPath .githooks` (blokira direktan push na `main`).
