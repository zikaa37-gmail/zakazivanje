# Curl Test Primeri

Svi primeri za testiranje API endpoint-a preko curl komandi.

## 🚀 Brzi Start

### Windows PowerShell (Preporučeno za Windows korisnike)

```powershell
# Kreiraj test korisnike
.\curl\create-test-users.ps1

# Login i dobij token (automatski se kopira u clipboard)
.\curl\login.ps1
```

### Git Bash / Linux / Mac

```bash
# Kreiraj test korisnike
./curl/create-test-users.sh

# Login i dobij token
./curl/login.sh
```

### Manuelno (bilo koji OS sa curl)

````bash
# 1. Kreiraj Test Korisnika

```bash
# Windows (PowerShell/Git Bash)
./curl/create-test-users.sh

# Ili direktno poziv
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d @curl/register-client.json
````

### 2. Login i Dobij Token

```bash
# Windows (PowerShell/Git Bash)
./curl/login.sh

# Ili direktno
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d @curl/login.json
```

Sačuvaj `accessToken` iz response-a!

### 3. Koristi Token za Zaštićene Endpoint-e

```bash
# Zameni YOUR_TOKEN_HERE sa pravim tokenom
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl http://localhost:3000/api/protected-endpoint \
  -H "Authorization: Bearer $TOKEN"
```

## 📁 Struktura Fajlova

```
curl/
├── README.md                    # Ova dokumentacija
├── login.ps1                    # PowerShell - Login
├── create-test-users.ps1        # PowerShell - Kreiranje test korisnika
├── health.sh                    # Bash - Health check
├── login.sh                     # Bash - Login
├── register-client.sh           # Bash - Registracija klijenta
├── register-provider.sh         # Bash - Registracija provajdera
├── forgot-password.sh           # Bash - Zahtev za reset lozinke
├── reset-password.sh            # Bash - Reset lozinke
├── verify-email.sh              # Bash - Verifikacija email-a
├── refresh-token.sh             # Bash - Refresh tokena
├── create-test-users.sh         # Bash - Kreiranje test korisnika
└── *.json                       # JSON payloads
```

## 🔐 Swagger Autorizacija

### Kako testirati u Swagger-u sa autentifikacijom:

1. **Otvori Swagger UI**: http://localhost:3000/api-docs

2. **Uloguj se**:
   - Klikni na `POST /api/auth/login`
   - Klikni "Try it out"
   - Unesi test kredencijale:
     ```json
     {
       "email": "test@zakazivanje.com",
       "password": "Test1234"
     }
     ```
   - Klikni "Execute"
   - **Kopiraj** `accessToken` iz response-a

3. **Autorizuj se**:
   - Klikni na **"Authorize"** dugme (gore desno, sa ikonom katanca)
   - Unesi: `Bearer <tvoj_accessToken>`
   - Primer: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Klikni "Authorize"
   - Klikni "Close"

4. **Testiranje zaštićenih endpoint-a**:
   - Sada kada klikneš "Try it out" na bilo kom zaštićenom endpoint-u
   - Token će automatski biti poslat u Authorization header-u
   - Videćeš ikonu katanca pored endpoint-a koji zahteva autentifikaciju

5. **Odjava**:
   - Klikni "Authorize" ponovo
   - Klikni "Logout"

## 📝 Test Korisnici

Nakon pokretanja `create-test-users.sh`, imaćeš:

### Client Account

- **Email**: test@zakazivanje.com
- **Password**: Test1234
- **Role**: client

### Provider Account

- **Email**: provider@zakazivanje.com
- **Password**: Provider1234
- **Role**: provider
- **Business**: Test Salon

## 🧪 Primeri Korišćenja

### Windows PowerShell

```powershell
# Health check
Invoke-RestMethod http://localhost:3000/health

# Login (najbolje koristiti login.ps1 skriptu)
.\curl\login.ps1

# Ili manuelno
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body '{"email":"test@zakazivanje.com","password":"Test1234"}'

# Koristi token
$token = $response.data.accessToken
Invoke-RestMethod -Uri "http://localhost:3000/api/protected" `
    -Headers @{Authorization="Bearer $token"}
```

### Git Bash / Linux / Mac

```bash
# Health check
bash curl/health.sh

# Registracija
bash curl/register-client.sh

# Login
bash curl/login.sh

# Refresh token (nakon login-a, zameni token)
bash curl/refresh-token.sh
```

## 🔄 Response Format

Svi endpoint-i vraćaju konzistentan format:

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "stack": "Stack trace (development only)"
  }
}
```

## 💡 Tips

- Koristi `jq` za formatiranje JSON output-a: `curl ... | jq`
- Sačuvaj token u environment varijablu za lakše korišćenje
- Proveri `server/.env.development` za database kredencijale
- Access token traje **15 minuta**
- Refresh token traje **365 dana**

## 🐛 Troubleshooting

**Problem**: `curl: command not found`

- **Rešenje**: Instaliraj curl ili koristi Git Bash na Windows-u

**Problem**: `Connection refused`

- **Rešenje**: Proveri da li je server pokrenut: `npm run dev`

**Problem**: `401 Unauthorized`

- **Rešenje**: Token je istekao ili je nevažeći, uloguj se ponovo

**Problem**: Email već postoji

- **Rešenje**: Koristi drugačiji email ili obriši test korisnika iz baze
