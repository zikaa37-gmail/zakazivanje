# Zakazivanje Backend Server

Backend API server za platformu zakazivanje termina.

## 🚀 Pokretanje

### Development

```bash
npm install
npm run dev
```

Server će biti pokrenut na `http://localhost:3000`

### Production

```bash
npm install
npm run build
npm start
```

## 📁 Struktura

```
src/
├── app.ts                    # Entry point
├── features/                 # Feature moduli
│   ├── auth/
│   ├── users/
│   ├── businesses/
│   ├── services/
│   ├── appointments/
│   └── reviews/
├── core/                     # Core funkcionalnosti
│   ├── database/
│   ├── middleware/
│   └── config/
└── shared/                   # Zajedničke utilities
    ├── utils/
    ├── types/
    └── constants/
```

## 🔧 Environment Variables

Kopiraj `.env.development` i konfiguriši za tvoje okruženje:

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=zakazivanje_dev
JWT_SECRET=your_secret_key
CORS_ORIGIN=*
```

## 📝 API Endpoints

### Health Check

- `GET /health` - Server health status

_Dodatni endpoint-i će biti dokumentovani kako se dodaju feature-i._

## 🗄️ Database

MySQL baza. Sequelize ORM automatski kreira tabele u development okruženju.

## 📚 Dokumentacija

- [Pravila programiranja](../CODING_RULES.md)
- [Pregled projekta](../src/docs/PROJECT_OVERVIEW.md)
