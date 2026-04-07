# Auth Smernice i Pravila

## Pregled

Aplikacija koristi JWT (JSON Web Token) autentifikaciju sa **access token** i **refresh token** mehanizmom za bezbednu autentifikaciju korisnika.

## Tokeni

### Access Token

- **Trajanje**: 15 minuta
- **Svrha**: Autorizacija API zahteva
- **Čuvanje**: localStorage (`accessToken`)
- **Format**: JWT token sa korisničkim podacima (user ID, role, email)
- **Korišćenje**: Automatski se dodaje u Authorization header svih zaštićenih API poziva

### Refresh Token

- **Trajanje**: 1 godina
- **Svrha**: Osvežavanje access tokena bez ponovnog logovanja
- **Čuvanje**: localStorage (`refreshToken`)
- **Format**: Opaque token (random string)
- **Korišćenje**: Šalje se na `/auth/refresh-token` endpoint kada access token istekne

## Flow Autentifikacije

### 1. Login Flow

```
Korisnik → Login forma → POST /auth/login
                            ↓
                    {
                      "email": "...",
                      "password": "..."
                    }
                            ↓
                  Backend validacija
                            ↓
                    Response:
                    {
                      "success": true,
                      "data": {
                        "accessToken": "...",
                        "refreshToken": "...",
                        "user": { ... }
                      }
                    }
                            ↓
        Čuvanje u localStorage (accessToken, refreshToken, user)
                            ↓
                  Redirekcija na home
```

### 2. Refresh Token Flow

```
API poziv → 401 Unauthorized
              ↓
      Auth Interceptor hvata 401
              ↓
    Proverava da li ima refreshToken
              ↓
POST /auth/refresh-token { "refreshToken": "..." }
              ↓
    Backend validira refresh token
              ↓
    Response:
    {
      "success": true,
      "data": {
        "accessToken": "...",  // Novi access token
        "refreshToken": "..."   // Novi refresh token
      }
    }
              ↓
Ažuriranje tokena u localStorage
              ↓
Ponavljanje originalnog API poziva sa novim access tokenom
              ↓
Vraćanje rezultata korisniku
```

### 3. Logout Flow

```
Korisnik → Logout dugme → AuthService.logout()
                              ↓
                  Brisanje iz localStorage:
                    - accessToken
                    - refreshToken
                    - user
                              ↓
                    Redirekcija na /auth/login
```

## API Endpointi

### Javni Endpointi (bez tokena)

Ovi endpointi **NE** zahtevaju access token u Authorization header-u:

- `POST /auth/login` - Login korisnika
- `POST /auth/register` - Registracija klijenta
- `POST /auth/register/business` - Registracija biznisa
- `POST /auth/forgot-password` - Zahtev za reset lozinke
- `POST /auth/reset-password` - Reset lozinke sa tokenom iz email-a
- `POST /auth/verify-email` - Verifikacija email-a sa tokenom

### Zaštićeni Endpointi (sa tokenom)

Svi ostali API endpointi zahtevaju validan access token u `Authorization: Bearer <token>` header-u.

### Refresh Token Endpoint

- `POST /auth/refresh-token` - Osvežavanje access tokena

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

## Auth Interceptor

`auth.interceptor.ts` automatski:

1. **Dodaje access token** u Authorization header za sve zaštićene API pozive
2. **Preskače javne endpointe** (login, register, forgot-password, itd.)
3. **Hvata 401 greške** i automatski poziva refresh token endpoint
4. **Osvežava tokene** i ponavlja originalni zahtev
5. **Izloguje korisnika** ako refresh token ne uspe

### Zaštita od beskonačne petlje

Interceptor koristi `isRefreshing` flag da spreči višestruke istovremene refresh pozive.

## Auth Guard

`auth.guard.ts` štiti rute koje zahtevaju autentifikaciju:

```typescript
{
  path: 'profile',
  component: ProfileComponent,
  canActivate: [authGuard]
}
```

Ako korisnik nije autentifikovan, guard ga redirektuje na `/auth/login` sa `returnUrl` query parametrom.

## AuthService Metode

### Autentifikacija

- `login(credentials)` - Login korisnika
- `registerClient(data)` - Registracija klijenta
- `registerBusiness(data)` - Registracija biznisa
- `logout()` - Logout korisnika
- `refreshAccessToken()` - Osvežavanje access tokena

### Password Recovery

- `forgotPassword(email)` - Slanje reset email-a
- `resetPassword(token, password)` - Reset lozinke
- `verifyEmail(token)` - Verifikacija email-a

### Helpers

- `isAuthenticated()` - Proverava da li je korisnik ulogovan
- `getToken()` - Vraća access token
- `getRefreshToken()` - Vraća refresh token
- `hasRole(role)` - Proverava da li korisnik ima određenu ulogu
- `isClient()` - Da li je korisnik klijent
- `isProvider()` - Da li je korisnik provajder (vlasnik biznisa)
- `isAdmin()` - Da li je korisnik admin

## Sigurnosne Preporuke

### Frontend

1. **NE čuvaj osetljive podatke u localStorage** - Samo tokeni i osnovno user info
2. **Koristi HTTPS** u produkciji - HTTP je nesiguran
3. **Implementiraj CSRF zaštitu** za state-changing operacije
4. **Validiraj sve inpute** pre slanja na backend
5. **Ne loguji tokene** u konzolu ili error tracking servise

### Backend (za implementaciju)

1. **Access token trajanje**: 15 minuta
2. **Refresh token trajanje**: 1 godina
3. **Koristi bcrypt** za heširanje lozinki (cost factor: 10-12)
4. **Invalidacija refresh tokena**: Nakon logout-a ili sumnjive aktivnosti
5. **Rate limiting**: Ograniči broj pokušaja logovanja (npr. 5 pokušaja / 15 min)
6. **Token rotation**: Svaki refresh vraća novi refresh token (stari se invalidira)
7. **Čuvaj refresh tokene** u bazi sa informacijama (user ID, device, IP, expiry)
8. **JWT claims** u access tokenu:
   ```json
   {
     "userId": 123,
     "email": "user@example.com",
     "role": "client",
     "iat": 1234567890,
     "exp": 1234568790
   }
   ```

## Primer Backend Implementacije (Node.js/Express)

### Refresh Token Endpoint

```javascript
app.post('/auth/refresh-token', async (req, res) => {
  const { refreshToken } = req.body;

  // Validacija: Da li refresh token postoji u bazi
  const tokenData = await db.refreshTokens.findOne({
    token: refreshToken,
    expiresAt: { $gt: new Date() },
  });

  if (!tokenData) {
    return res.status(401).json({
      success: false,
      error: { message: 'Nevažeći ili istekao refresh token' },
    });
  }

  // Kreiranje novih tokena
  const user = await db.users.findById(tokenData.userId);
  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken();

  // Brisanje starog refresh tokena
  await db.refreshTokens.deleteOne({ _id: tokenData._id });

  // Čuvanje novog refresh tokena
  await db.refreshTokens.create({
    token: newRefreshToken,
    userId: user.id,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 godina
  });

  res.json({
    success: true,
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    },
  });
});
```

## Testiranje

### Testiranje Access Token Expirations

1. Ručno skrati trajanje access tokena na 1 minutu
2. Loguj se
3. Sačekaj da token istekne
4. Napravi API poziv
5. Proveri da se automatski osvežio token i pozvao ponovo endpoint

### Testiranje Refresh Token Failure

1. Obriši refresh token iz localStorage
2. Sačekaj da access token istekne
3. Napravi API poziv
4. Proveri da si redirektovan na login stranicu

## Troubleshooting

### Problem: 401 greška na svim API pozivima

**Uzrok**: Access token je istekao, a refresh token ne postoji ili je nevažeći

**Rešenje**: Logout i ponovo login

### Problem: Beskonačna petlja refresh poziva

**Uzrok**: Refresh endpoint vraća 401, što ponovo okida refresh

**Rešenje**: Interceptor proverava `isRefreshEndpoint` i ne pokušava refresh za taj endpoint

### Problem: Korisnik je izlogovan posle osvežavanja stranice

**Uzrok**: Tokeni nisu sačuvani u localStorage

**Rešenje**: Proveri da `setSession()` metoda pravilno čuva tokene

## Dodatna Dokumentacija

- [Auth Module README](../auth/README.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [API Models](../shared/models/api.models.ts)
