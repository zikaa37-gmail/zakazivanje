# Task Breakdown - MVP Faza

## 🎯 MVP Scope

Cilj MVP-a je da omogući osnovnu funkcionalnost zakazivanja termina sa autentifikacijom i jednostavnim admin panelom.

---

## Epic 1: Projekat Setup i Infrastruktura

### Task 1.1: GitHub Repository Setup ✅

- [x] Kreiran repo: https://github.com/zikaa37-gmail/zakazivanje
- [x] README.md
- [x] .gitignore
- [x] Inicijalni commit

### Task 1.2: GitHub Project Board Setup

- [ ] Kreirati GitHub Project
- [ ] Postaviti kolone: Backlog, To Do, In Progress, In Review, Done
- [ ] Kreirati issue templates (Feature, Bug, Task)
- [ ] Labelе: frontend, backend, bug, enhancement, documentation

### Task 1.3: MySQL Baza Setup

- [ ] Instalirati MySQL
- [ ] Kreirati development bazu: `zakazivanje_dev`
- [ ] Kreirati production bazu: `zakazivanje_prod`
- [ ] Konfigurisati `.env.development` i `.env.production`

### Task 1.4: External Services Setup

- [ ] SendGrid account (za email)
- [ ] Cloudinary account (za upload slika)
- [ ] Konfigurisati API keys u environment fajlovima

---

## Epic 2: Backend - Autentifikacija

### Task 2.1: Database Models

- [ ] **User Model** (`server/src/features/auth/auth.model.ts`)
  - id, email, password, firstName, lastName, phone, role, avatar
  - isEmailVerified, emailVerificationToken
  - passwordResetToken, passwordResetExpires
  - isActive, createdAt, updatedAt
- [ ] **Business Model** (`server/src/features/businesses/business.model.ts`)
  - id, ownerId, name, pib, registrationNumber
  - address, city, country, lat, lng
  - businessPhone, businessEmail, website, logo, coverImage
  - description, category, isApproved, isActive
  - rating, reviewCount, createdAt, updatedAt

### Task 2.2: Auth Service Layer

- [ ] `auth.service.ts` - Business logic
  - `register(userData)` - Registracija korisnika
  - `registerBusiness(businessData)` - Registracija pružaoca usluga
  - `login(email, password)` - Login
  - `logout(userId)` - Logout
  - `verifyEmail(token)` - Email verifikacija
  - `forgotPassword(email)` - Slanje reset linka
  - `resetPassword(token, newPassword)` - Reset lozinke
  - `generateJWT(user)` - Generisanje JWT tokena
  - `hashPassword(password)` - Hash-ovanje lozinke
  - `comparePasswords(plain, hashed)` - Poređenje

### Task 2.3: Auth API Endpoints

- [ ] `POST /api/auth/register` - Registracija klijenta
- [ ] `POST /api/auth/register/business` - Registracija pružaoca
- [ ] `POST /api/auth/login` - Login
- [ ] `POST /api/auth/logout` - Logout
- [ ] `GET /api/auth/verify-email/:token` - Verifikacija email-a
- [ ] `POST /api/auth/forgot-password` - Zahtev za reset lozinke
- [ ] `POST /api/auth/reset-password` - Reset lozinke
- [ ] `GET /api/auth/me` - Trenutni korisnik (protected)

### Task 2.4: Validators

- [ ] `auth.validation.ts` - Joi schemas
  - registerClientSchema
  - registerBusinessSchema
  - loginSchema
  - forgotPasswordSchema
  - resetPasswordSchema

### Task 2.5: Middleware

- [ ] `auth.middleware.ts` - Verifikacija JWT tokena
- [ ] `role.middleware.ts` - Provera role korisnika
  - isClient
  - isBusinessOwner
  - isAdmin

### Task 2.6: Email Templates

- [ ] Welcome email (za klijenta)
- [ ] Welcome email (za pružaoca usluga)
- [ ] Email verification
- [ ] Password reset
- [ ] Appointment confirmation (za kasnije)

---

## Epic 3: Frontend - Auth Sekcija

### Task 3.1: Auth Module Structure

```
features/auth/
├── login/
│   ├── login.component.ts
│   ├── login.component.html
│   └── login.component.scss
├── register/
│   ├── register.component.ts
│   ├── register.component.html
│   └── register.component.scss
├── forgot-password/
│   ├── forgot-password.component.ts
│   ├── forgot-password.component.html
│   └── forgot-password.component.scss
├── reset-password/
│   ├── reset-password.component.ts
│   ├── reset-password.component.html
│   └── reset-password.component.scss
├── verify-email/
│   ├── verify-email.component.ts
│   ├── verify-email.component.html
│   └── verify-email.component.scss
└── auth.service.ts
```

### Task 3.2: Login Component

- [ ] Kreirati LoginComponent
- [ ] Reaktivna forma (email, password, remember me)
- [ ] Loading state
- [ ] Error handling
- [ ] Redirect na osnovu role
  - Client → `/dashboard`
  - Business → `/admin`
  - Admin → `/super-admin`
- [ ] Link ka registraciji i forgot password

### Task 3.3: Register Component

- [ ] Kreirati RegisterComponent
- [ ] Tab switcher (Korisnik / Pružalac usluga)
- [ ] **Tab 1: Klijent**
  - Ime, Prezime, Email, Telefon
  - Lozinka, Potvrda lozinke
  - ToS checkbox
- [ ] **Tab 2: Pružalac**
  - Lični podaci (ime, prezime, email, telefon)
  - Podaci o firmi (naziv, PIB, matični, adresa, grad)
  - Business email, telefon, website
  - Lozinka, Potvrda lozinke
  - ToS checkbox
- [ ] Validacija (email format, phone format, PIB format, password strength)
- [ ] Password strength indicator
- [ ] Success message → redirect na email verification poruku

### Task 3.4: Forgot Password Component

- [ ] Kreirati ForgotPasswordComponent
- [ ] Email input
- [ ] Validacija
- [ ] Success message
- [ ] Link nazad na login

### Task 3.5: Reset Password Component

- [ ] Kreirati ResetPasswordComponent
- [ ] Token validation (iz URL-a)
- [ ] Nova lozinka input
- [ ] Potvrda lozinke
- [ ] Password strength indicator
- [ ] Success message → redirect na login

### Task 3.6: Email Verification Component

- [ ] Kreirati VerifyEmailComponent
- [ ] Automatska verifikacija na osnovu tokena iz URL-a
- [ ] Loading state
- [ ] Success/Error message
- [ ] Auto redirect na login posle 3s

### Task 3.7: Auth Service (Frontend)

- [ ] `auth.service.ts`
  - `login(email, password)` → Observable
  - `register(userData)` → Observable
  - `registerBusiness(businessData)` → Observable
  - `logout()` → void
  - `forgotPassword(email)` → Observable
  - `resetPassword(token, password)` → Observable
  - `verifyEmail(token)` → Observable
  - `getCurrentUser()` → Observable
  - `isAuthenticated()` → boolean
  - `getUserRole()` → string
  - Signal za currentUser
  - Signal za isLoggedIn

### Task 3.8: Auth Guards

- [ ] `authGuard` - Provera da li je korisnik prijavljen
- [ ] `roleGuard` - Provera role (client/business/admin)
- [ ] `guestGuard` - Sprečavanje pristupa auth stranicama ako je prijavljen

### Task 3.9: Auth Interceptor

- [ ] Dodavanje JWT tokena u svaki request
- [ ] Refresh token logic (opciono za MVP)

### Task 3.10: Routing

```typescript
{
  path: 'login',
  loadComponent: () => import('./features/auth/login/login.component'),
  canActivate: [guestGuard]
},
{
  path: 'register',
  loadComponent: () => import('./features/auth/register/register.component'),
  canActivate: [guestGuard]
},
{
  path: 'forgot-password',
  loadComponent: () => import('./features/auth/forgot-password/forgot-password.component'),
  canActivate: [guestGuard]
},
{
  path: 'reset-password',
  loadComponent: () => import('./features/auth/reset-password/reset-password.component'),
  canActivate: [guestGuard]
},
{
  path: 'verify-email/:token',
  loadComponent: () => import('./features/auth/verify-email/verify-email.component')
}
```

---

## Epic 4: Client Dashboard (Korisnički Panel)

### Task 4.1: Client Dashboard Layout

- [ ] `features/client/dashboard/dashboard.component.ts`
- [ ] Header sa search bar-om
- [ ] Kategorije usluga (kao chip-ovi)
- [ ] Popularni pružaoci usluga (carousel)
- [ ] CTA za zakazivanje

### Task 4.2: Pretraga Pružalaca Usluga

- [ ] Search input sa autocomplete
- [ ] Filter po kategoriji
- [ ] Filter po lokaciji
- [ ] Filter po ceni
- [ ] Filter po oceni
- [ ] Rezultati pretrage (card layout)

### Task 4.3: Moji Termini

- [ ] Lista nadolazećih termina
- [ ] Lista prošlih termina
- [ ] Detalji termina
- [ ] Otkazivanje termina
- [ ] Ocenjivanje i recenzija

### Task 4.4: Profil

- [ ] Prikaz i izmena ličnih podataka
- [ ] Promena lozinke
- [ ] Upload avatara
- [ ] Delete nalog

---

## Epic 5: Business Admin Panel

### Task 5.1: Business Dashboard

- [ ] `features/business/dashboard/dashboard.component.ts`
- [ ] Statistika (broj termina danas, ove nedelje, ovog meseca)
- [ ] Nadolazeći termini
- [ ]Notifikacije
- [ ] Quick actions

### Task 5.2: Profil Biznisa

- [ ] Prikaz i izmena podataka o firmi
- [ ] Upload logo-a
- [ ] Upload cover slike
- [ ] Galerija slika
- [ ] Radno vreme
- [ ] Lokacija (Google Maps integration)

### Task 5.3: Upravljanje Uslugama

- [ ] Lista usluga
- [ ] Dodavanje usluge (naziv, opis, trajanje, cena, kategorija)
- [ ] Izmena usluge
- [ ] Brisanje usluge
- [ ] Aktiviranje/deaktiviranje usluge

### Task 5.4: Kalendar i Termini

- [ ] Calendar view (monthly, weekly, daily)
- [ ] Lista termina (grid/list view)
- [ ] Detalji termina
- [ ] Prihvatanje/odbijanje zahteva
- [ ] Blokiranje termina (pauze, sastanci)
- [ ] Ručno dodavanje termina

### Task 5.5: Zaposleni (Opciono za MVP)

- [ ] Lista zaposlenih
- [ ] Dodavanje zaposlenog
- [ ] Dodela usluga zaposlenom
- [ ] Radno vreme po zaposlenom
- [ ] Kalendar po zaposlenom

---

## Epic 6: Core Funkcionalnosti - Zakazivanje

### Task 6.1: Backend - Appointments API

- [ ] `POST /api/appointments` - Kreiranje termina
- [ ] `GET /api/appointments` - Lista termina (sa filterima)
- [ ] `GET /api/appointments/:id` - Detalji termina
- [ ] `PUT /api/appointments/:id` - Izmena termina
- [ ] `DELETE /api/appointments/:id` - Otkazivanje termina
- [ ] `PUT /api/appointments/:id/confirm` - Potvrda termina
- [ ] `PUT /api/appointments/:id/complete` - Označavanje kao završeno

### Task 6.2: Frontend - Booking Flow

- [ ] Odabir pružaoca usluga
- [ ] Odabir usluge
- [ ] Odabir zaposlenog (ako postoji)
- [ ] Izbor datuma
- [ ] Izbor vremena (prikaz dostupnih slotova)
- [ ] Potvrda detalja
- [ ] Submitovanje zahteva
- [ ] Success message

### Task 6.3: Availability Logic

- [ ] Backend servis za računanje dostupnih termina
- [ ] Uzimanje u obzir radnog vremena
- [ ] Uzimanje u obzir trajanja usluge
- [ ] Uzimanje u obzir već zakazanih termina
- [ ] Uzimanje u obzir blokiranih termina

---

## Epic 7: Notifikacije

### Task 7.1: Email Notifikacije

- [ ] Potvrda zakazivanja (klijentu)
- [ ] Notifikacija o novom zahtevu (pružaocu)
- [ ] Potvrda od pružaoca (klijentu)
- [ ] Podsetnik 24h pre termina
- [ ] Podsetnik 2h pre termina
- [ ] Otkazivanje termina

### Task 7.2: In-App Notifikacije (Opciono za MVP)

- [ ] Notification center
- [ ] Real-time updates (Socket.io)
- [ ] Badge sa brojem notifikacija

---

## Epic 8: Super Admin Panel (Opciono za MVP)

### Task 8.1: Dashboard

- [ ] Statistika platforme
- [ ] Novi biznisi za odobravanje
- [ ] Reklamacije
- [ ] System health

### Task 8.2: Upravljanje Korisnicima

- [ ] Lista korisnika
- [ ] Detalji korisnika
- [ ] Blokiranje/odblokiranje
- [ ] Brisanje korisnika

### Task 8.3: Upravljanje Biznesima

- [ ] Lista biznisa
- [ ] Odobravanje novih biznisa
- [ ] Deaktiviranje biznisa
- [ ] Pregled statistike po bizнisu

---

## 📊 Prioritizacija

### Must Have (MVP)

1. ✅ Projekat setup
2. Autentifikacija (registration, login, email verification)
3. Client dashboard (pretraga, zakazivanje)
4. Business admin (profil, usluge, termini)
5. Basic booking flow
6. Email notifikacije

### Should Have (Post-MVP)

1. Forgot/Reset password
2. Zaposleni management
3. Reviews i ratings
4. Advanced search filters
5. Calendar view za klijente

### Could Have (Future)

1. Super admin panel
2. In-app notifications
3. Social login (Google, Facebook)
4. Multi-language support
5. Mobile app
6. Payment integration
7. Analytics dashboard

### Won't Have (Not in scope)

1. Chat sistem (za sada)
2. APR integracija (za sada)
3. Loyalty program

---

## 🚀 Sprint Plan (Primer - 2 nedelje)

### Sprint 1 (Week 1-2): Auth + Setup

- GitHub setup ✅
- MySQL setup
- Backend auth API
- Frontend auth components
- Basic routing i guards

### Sprint 2 (Week 3-4): Client Dashboard

- Business profile
- Services management
- Client search
- Business list

### Sprint 3 (Week 5-6): Booking Core

- Appointments API
- Booking flow
- Calendar view
- Availability logic

### Sprint 4 (Week 7-8): Admin Panel + Polish

- Business dashboard
- Appointment management
- Email notifications
- Testing i bug fixes

---

## 📝 Definition of Done

Za svaki task:

- [ ] Kod je napisan prema CODING_RULES.md
- [ ] Komponente su standalone
- [ ] Koriste se signali gde je priклadno
- [ ] Error handling je implementiran
- [ ] Loading states su implementirani
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Kod je testiran lokalno
- [ ] Git commit sa jasnom porukom
- [ ] PR je kreiran i spreman za review

---

**Verzija**: 1.0  
**Zadnja izmena**: April 7, 2026
