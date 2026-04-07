# Zakazivanje Backend Server

Backend API server za platformu zakazivanje termina. Node.js/Express + TypeScript + MySQL.

## 🚀 Quick Start

### 1. Instalacija zavisnosti

```bash
npm install
```

### 2. MySQL Baza podataka

**Kreiraj bazu:**

```sql
CREATE DATABASE zakazivanje_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**Ili koristi SQL skripte:**

```bash
cd sql
# Windows PowerShell
.\setup_database.ps1

# Linux/Mac
chmod +x setup_database.sh
./setup_database.sh
```

### 3. Konfiguracija (.env)

Proveri i ažuriraj `.env.development`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=      # Tvoja MySQL lozinka
DB_NAME=zakazivanje_dev
JWT_SECRET=super-secret-jwt-key-for-development-only-change-in-production-12345
```

### 4. Pokretanje

```bash
npm run dev
```

Server će biti pokrenut na `http://localhost:3000`

### 5. Testiranje API-ja

**Brzi test sa curl primerima:**

```bash
# Kreiraj test korisnike
bash curl/create-test-users.sh

# Login i dobij token
bash curl/login.sh

# Kopiraj accessToken iz output-a i koristi ga
```

Pročitaj detaljne instrukcije u [curl/README.md](curl/README.md)

**Swagger UI sa autorizacijom:**

1. Otvori browser: http://localhost:3000/api-docs
2. Test login:
   - Klikni `POST /api/auth/login`
   - Klikni "Try it out"
   - Unesi kredencijale (test@zakazivanje.com / Test1234)
   - Klikni "Execute"
   - **Kopiraj** `accessToken` iz response-a
3. Autorizuj se:
   - Klikni **"Authorize"** dugme (gore desno, ikonica katanca 🔒)
   - Unesi: `Bearer <accessToken>`
   - Klikni "Authorize" → "Close"
4. Sada možeš testirati sve zaštićene endpoint-e direktno iz Swagger-a!

## � API Dokumentacija (Swagger)

Swagger UI dokumentacija je dostupna na: **http://localhost:3000/api-docs**

Swagger će automatski prikazati sve API endpointe sa:

- Request/response schémama
- Primérima zahteva
- Opcijom "Try it out" za testiranje direktno iz browser-a
- Autentifikaciju (JWT bearer token)

## �📁 Struktura

```
server/
├── src/
│   ├── app.ts                      # Entry point
│   ├── modules/                    # Feature moduli
│   │   └── auth/
│   │       ├── auth.controller.ts  # Routes
│   │       ├── auth.service.ts     # Business logika
│   │       └── auth.validation.ts  # Joi validacija
│   ├── core/
│   │   ├── database/
│   │   │   ├── connection.ts       # Sequelize konekcija
│   │   │   └── models/             # Sequelize modeli
│   │   │       ├── User.model.ts
│   │   │       └── RefreshToken.model.ts
│   │   └── middleware/
│   │       ├── auth.middleware.ts  # JWT autentifikacija
│   │       ├── validation.middleware.ts
│   │       ├── error.middleware.ts
│   │       └── not-found.middleware.ts
│   └── shared/
│       ├── utils/
│       │   ├── jwt.util.ts         # JWT tokeni
│       │   └── password.util.ts    # Bcrypt hashing
│       └── types/
│           └── api.types.ts        # TypeScript tipovi
├── curl/                           # cURL test primeri
│   ├── README.md                   # Detaljne instrukcije
│   ├── create-test-users.sh        # Kreiranje test korisnika
│   ├── login.sh                    # Login i dobijanje tokena
│   └── *.sh                        # Ostali API testovi
├── sql/                            # SQL migracije
└── .env.development                # Development config
```

## 🔐 Auth API Endpoints

Svi endpointi su prefixovani sa `/api/auth`

### Public Endpoints (bez tokena)

#### POST /api/auth/login

Login korisnika

**Request:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "a1b2c3d4...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "client"
    }
  }
}
```

#### POST /api/auth/register

Registracija klijenta

**Request:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+381641234567",
  "whatsappNumber": "+381641234567",
  "preferredCommunication": "email"
}
```

#### POST /api/auth/register/business

Registracija provajdera (vlasnika biznisa)

**Request:**

```json
{
  "email": "business@example.com",
  "password": "password123",
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+381641234567",
  "businessName": "Beauty Salon",
  "businessCategory": "salon",
  "pib": "123456789",
  "businessPhone": "+381111234567"
}
```

#### POST /api/auth/forgot-password

Slanje reset password email-a

**Request:**

```json
{
  "email": "user@example.com"
}
```

#### POST /api/auth/reset-password

Reset lozinke sa tokenom

**Request:**

```json
{
  "token": "reset-token-from-email",
  "password": "newPassword123",
  "confirmPassword": "newPassword123"
}
```

#### POST /api/auth/verify-email

Verifikacija email-a

**Request:**

```json
{
  "token": "verification-token-from-email"
}
```

#### POST /api/auth/refresh-token

Osvežavanje access tokena

**Request:**

```json
{
  "refreshToken": "current-refresh-token"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "accessToken": "new-access-token",
    "refreshToken": "new-refresh-token"
  }
}
```

## 🔧 Environment Variables

| Variable                   | Description                        | Default               |
| -------------------------- | ---------------------------------- | --------------------- |
| `NODE_ENV`                 | Okruženje (development/production) | development           |
| `PORT`                     | Port na kojem server sluša         | 3000                  |
| `DB_HOST`                  | MySQL host                         | localhost             |
| `DB_PORT`                  | MySQL port                         | 3306                  |
| `DB_USER`                  | MySQL user                         | root                  |
| `DB_PASSWORD`              | MySQL password                     | (prazno)              |
| `DB_NAME`                  | Naziv baze                         | zakazivanje_dev       |
| `JWT_SECRET`               | Secret za JWT tokene               | (change!)             |
| `JWT_ACCESS_EXPIRES_IN`    | Access token trajanje              | 15m                   |
| `JWT_REFRESH_EXPIRES_DAYS` | Refresh token trajanje             | 365                   |
| `CORS_ORIGIN`              | CORS origin                        | http://localhost:4200 |
| `FRONTEND_URL`             | Frontend URL                       | http://localhost:4200 |

## 📦 Dependencies

### Core

- **express** - Web framework
- **typescript** - TypeScript
- **mysql2** - MySQL driver
- **sequelize** - ORM

### Auth & Security

- **bcrypt** - Password hashing
- **jsonwebtoken** - JWT tokeni
- **helmet** - Security headers
- **cors** - CORS
- **express-rate-limit** - Rate limiting

### Validation

- **joi** - Schema validation

### Dev Tools

- **nodemon** - Auto-restart
- **ts-node** - TypeScript execution
- **morgan** - HTTP logging

## 🧪 Testiranje

```bash
npm test
```

## 📝 Scripts

```bash
npm run dev      # Development mod sa auto-restart
npm run build    # Build TypeScript u JavaScript
npm start        # Production mod
npm test         # Pokretanje testova
npm run lint     # ESLint
```

## 🛠️ Development

### Pokretanje MySQL-a (Windows)

Ako koristiš XAMPP:

1. Pokreni XAMPP Control Panel
2. Start Apache i MySQL
3. Uveri se da MySQL radi na portu 3306

### Testiranje API-ja

**Swagger UI (Preporučeno):**

1. Pokreni server: `npm run dev`
2. Otvori browser: http://localhost:3000/api-docs
3. Probaj endpoint:
   - Klikni na endpoint (npr. POST /api/auth/login)
   - Klikni "Try it out"
   - Unesi parametre
   - Klikni "Execute"
4. Za zaštićene endpointe (ako postoje):
   - Prvo se uloguj preko `/api/auth/login`
   - Kopiraj `accessToken` iz response-a
   - Klikni "Authorize" dugme (gore desno)
   - Unesi: `Bearer <accessToken>`
   - Klikni "Authorize"

**Postman ili cURL:**
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=zakazivanje_dev
JWT_SECRET=your_secret_key
CORS_ORIGIN=\*

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
```
