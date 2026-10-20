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

Frontend: http://localhost:4200, API: http://localhost:8000/api.

Pre prvog push-a: `git config core.hooksPath .githooks` (blokira direktan push na `main`).
