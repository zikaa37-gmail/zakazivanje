# Auth Module - Dokumentacija

## 📁 Struktura

```
auth/
├── login/
│   ├── login.component.ts        # Login komponenta
│   ├── login.component.html      # Login template
│   └── login.component.scss      # Login stilovi
├── register/
│   ├── register.component.ts     # Registracija klijenta
│   ├── register.component.html
│   └── register.component.scss
├── register-business/
│   ├── register-business.component.ts    # Registracija biznisa
│   ├── register-business.component.html
│   └── register-business.component.scss
├── forgot-password/
│   ├── forgot-password.component.ts      # Zaboravljena lozinka
│   ├── forgot-password.component.html
│   └── forgot-password.component.scss
├── reset-password/
│   ├── reset-password.component.ts       # Reset lozinke
│   ├── reset-password.component.html
│   └── reset-password.component.scss
├── verify-email/
│   ├── verify-email.component.ts         # Email verifikacija
│   ├── verify-email.component.html
│   └── verify-email.component.scss
├── auth.service.ts               # Auth servis (centralni)
└── auth.model.ts                 # Modeli i tipovi
```

## 🚀 Komponente

### 1. LoginComponent

**Putanja**: `/auth/login`

- Login forma (email + password)
- Validacija polja
- Redirekcija nakon uspešnog logina
- Link ka forgot-password
- Link ka registraciji

### 2. RegisterComponent

**Putanja**: `/auth/register`

- Registracija **klijenta**
- Polja: ime, prezime, email, telefon, WhatsApp, lozinka
- Preferirani način komunikacije (email/whatsapp/both)
- Link ka register-business
- Link ka login

### 3. RegisterBusinessComponent

**Putanja**: `/auth/register-business`

- Registracija **vlasnika biznisa**
- **Lični podaci**: ime, prezime, email, telefon, WhatsApp, lozinka
- **Podaci o bizuisu**: naziv, kategorija, PIB, matični broj, telefon, WhatsApp
- Admin odobrenje potrebno nakon registracije
- Link ka register (klijent)
- Link ka login

### 4. ForgotPasswordComponent

**Putanja**: `/auth/forgot-password`

- Forma za unos email adrese
- Slanje reset linka na email/WhatsApp
- Info poruka za korisnika

### 5. ResetPasswordComponent

**Putanja**: `/auth/reset-password?token=xyz`

- Nova lozinka + potvrda
- Token iz query params
- Validacija tokena

### 6. VerifyEmailComponent

**Putanja**: `/auth/verify-email?token=xyz`

- Automatska verifikacija pri učitavanju
- Success/Error prikaz
- Redirekcija na login nakon uspešne verifikacije

## 📊 Auth Service

### Metode

```typescript
// Login
login(credentials: LoginRequest): Observable<AuthResponse>

// Registracija klijenta
registerClient(data: RegisterClientRequest): Observable<RegisterResponse>

// Registracija biznisa
registerBusiness(data: RegisterBusinessRequest): Observable<RegisterResponse>

// Zaboravljena lozinka
forgotPassword(data: ForgotPasswordRequest): Observable<ForgotPasswordResponse>

// Reset lozinke
resetPassword(data: ResetPasswordRequest): Observable<ResetPasswordResponse>

// Verifikacija email-a
verifyEmail(data: VerifyEmailRequest): Observable<VerifyEmailResponse>

// Logout
logout(): void

// Helpers
isAuthenticated(): boolean
getToken(): string | null
hasRole(role: UserRole): boolean
isClient(): boolean
isProvider(): boolean
isAdmin(): boolean
```

### Signali

```typescript
currentUser = signal<User | null>(null);
isLoading = signal<boolean>(false);
```

## 🎯 Auth Flow

### Registracija Klijenta

```
1. Korisnik popunjava formu (/auth/register)
2. POST /api/auth/register
3. Backend kreira user sa role='client'
4. Slanje verifikacionog email/WhatsApp
5. Korisnik klika link → /auth/verify-email?token=xyz
6. POST /api/auth/verify-email
7. Email verifikovan → redirect na /auth/login
```

### Registracija Biznisa

```
1. Korisnik popunjava formu (/auth/register-business)
2. POST /api/auth/register/business
3. Backend kreira:
   - User sa role='provider'
   - Business sa is_approved=false
4. Slanje verifikacionog email/WhatsApp
5. Korisnik klika link → /auth/verify-email?token=xyz
6. POST /api/auth/verify-email
7. Email verifikovan
8. Admin mora odobriti biznis (is_approved=true)
9. Nakon odobrenja, biznis vidljiv na platformi
```

### Login

```
1. Korisnik unosi email + password (/auth/login)
2. POST /api/auth/login
3. Backend proverava:
   - Email/password match
   - is_email_verified = true
   - is_active = true
4. Vraća JWT token + user data
5. Frontend čuva token u localStorage
6. Redirekcija na početnu
```

### Forgot Password

```
1. Korisnik unosi email (/auth/forgot-password)
2. POST /api/auth/forgot-password
3. Backend generiše reset token
4. Slanje email/WhatsApp sa linkom
5. Korisnik klika link → /auth/reset-password?token=xyz
6. Korisnik unosi novu lozinku
7. POST /api/auth/reset-password
8. Lozinka promenjena → redirect na /auth/login
```

## 🔐 Modeli

### User

```typescript
interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  whatsappNumber?: string;
  avatar?: string;
  role: UserRole; // 'client' | 'provider' | 'admin'
  isEmailVerified: boolean;
  preferredCommunication: CommunicationType; // 'email' | 'whatsapp' | 'both'
  createdAt: string;
  lastLogin?: string;
}
```

### Requests

- `LoginRequest` - email, password
- `RegisterClientRequest` - email, password, firstName, lastName, phone, whatsappNumber, preferredCommunication
- `RegisterBusinessRequest` - extends RegisterClientRequest + businessName, businessCategory, pib, registrationNumber, businessPhone, businessWhatsapp
- `ForgotPasswordRequest` - email
- `ResetPasswordRequest` - token, password, confirmPassword
- `VerifyEmailRequest` - token

### Responses

- `AuthResponse` - success, data: { token, user }
- `RegisterResponse` - success, message, data?: { userId }
- `ForgotPasswordResponse` - success, message
- `ResetPasswordResponse` - success, message
- `VerifyEmailResponse` - success, message, data?: { user }

## 🎨 Stilovi

- **Material Design** komponente
- **Responsive design** (mobile-first)
- Zajedničke klase:
  - `.full-width` - 100% širina
  - `.half-width` - flex 1 (50% u redu)
  - `.error-message` - crvena pozadina
  - `.success-message` - zelena pozadina
  - `.form-row` - flex red za polja

## 🔄 Lifecycle

1. **Inicijalizacija** - AuthService se kreira i učitava user iz localStorage
2. **Login** - Čuvanje tokena i user-a, postavljanje currentUser signala
3. **Logout** - Brisanje tokena i user-a, redirect na login
4. **Guard** - authGuard proverava isAuthenticated() pre pristupa zaštićenim rutama

## ✅ Best Practices

- ✅ Sve auth rute pod `/auth/*` prefix
- ✅ Lazy loading svih komponenti
- ✅ Signali za reaktivnost
- ✅ Reactive Forms sa validacijom
- ✅ OnPush change detection
- ✅ Odvojeni HTML/SCSS fajlovi (bez inline)
- ✅ Organizovani importi (Angular → Alias → Lokalni)
- ✅ Error handling sa user-friendly porukama
- ✅ Loading state (spinner)
