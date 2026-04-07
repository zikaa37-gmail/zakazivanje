# Razvojne Napomene - Zakazivanje Platforma

> Ovaj dokument sadrži sve napomene, odluke i promene tokom razvoja projekta.

---

## 📅 April 7, 2026

### GitHub Repository

- **URL**: https://github.com/zikaa37-gmail/zakazivanje
- **Owner**: zikaa37-gmail

### Inicijalna Postavka Projekta

#### Struktura Projekta

- ✅ Kreiran frontend (Angular 18+)
- ✅ Kreiran backend (Node.js + Express)
- ✅ Postavljena osnovna arhitektura
- ✅ Kreirani inicijalni dokumenti (CODING_RULES.md, PROJECT_OVERVIEW.md)

---

## 🔐 Autentifikacija i Korisnici

### Tipovi Korisnika

Aplikacija podržava **dva tipa korisnika**:

#### 1. **Pružalac Usluga** (Business Owner)

Registracija zahteva sledeće podatke:

- **Podaci o firmi**:
  - Naziv firme
  - Mesto (adresa)
  - PIB (Poreski identifikacioni broj)
  - Matični broj
  - Kontakt podaci (preuzeti iz APR ako je moguće)
  - Email firme
  - Telefon firme
  - Website (opciono)
  - Logo (opciono)

**Flow**:

1. Registracija → Forma sa podacima o firmi
2. Verifikacija email adrese
3. Odobravanje od strane administratora (opciono)
4. Login → Redirect na **Admin Panel**

#### 2. **Krajnji Korisnik** (Client)

Registracija zahteva osnovne podatke:

- Email adresa
- Ime
- Prezime
- Telefon
- Lozinka

**Flow**:

1. Registracija → Jednostavna forma
2. Verifikacija email adrese
3. Login → Redirect na **Korisnički Panel** (zakazivanje)

---

## 🎨 Auth Sekcija - Stranice

Auth modul treba da sadrži sledeće stranice:

### 1. **Login** (`/login`)

- Email/Username polje
- Password polje
- "Zapamti me" checkbox
- Link ka "Zaboravili ste lozinku?"
- Link ka registraciji
- Login dugme
- Opciono: Social login (Google, Facebook)

### 2. **Registracija** (`/register`)

- Izbor tipa korisnika:
  - [ ] Želim da zakažem termin (Korisnik)
  - [ ] Želim da pružam usluge (Pružalac usluga)

**Za Korisnika**:

- Ime
- Prezime
- Email
- Telefon
- Lozinka
- Potvrda lozinke
- Checkbox za prihvatanje uslova korišćenja

**Za Pružaoca Usluga**:

- Lični podaci (ime, prezime, email, telefon)
- Naziv firme
- PIB
- Matični broj
- Adresa
- Grad
- Kontakt telefon firme
- Email firme
- Website (opciono)
- Checkbox za prihvatanje uslova

### 3. **Forgot Password** (`/forgot-password`)

- Email input
- Dugme za slanje reset linka
- Link nazad na login

### 4. **Reset Password** (`/reset-password`)

- Token iz URL-a (query param)
- Nova lozinka
- Potvrda nove lozinke
- Dugme za reset

### 5. **Email Verification** (`/verify-email`)

- Token iz URL-a
- Automatska verifikacija
- Redirect na login posle uspešne verifikacije

---

## 🚪 Post-Login Redirect Flow

### Korisnik (Client)

```
Login → Dashboard → Glavna stranica sa:
  - Pretraga pružalaca usluga
  - Moji termini
  - Favoriti
  - Profil
```

### Pružalac Usluga (Business Owner)

```
Login → Admin Panel → Dashboard sa:
  - Pregled nadolazećih termina
  - Kalendar
  - Upravljanje uslugama
  - Upravljanje zaposlenima
  - Statistika
  - Profil firme
```

### Administrator (Super Admin)

```
Login → Super Admin Panel → Dashboard sa:
  - Pregled svih korisnika
  - Pregled svih biznisa
  - Moderacija
  - Statistika
  - Sistem podešavanja
```

---

## 📊 Task Management - Preporuke

### Besplatni Alati

#### 1. **GitHub Projects** ⭐ PREPORUKA

- **Link**: https://github.com/features/issues
- **Prednosti**:
  - Integrisano sa GitHub repoom
  - Besplatno za sve projekte
  - Kanban board
  - Task tracking sa Issues
  - Automatizacija
  - Templates za issues
- **Kako koristiti**:
  1. Idi na repo: https://github.com/zikaa37-gmail/zakazivanje
  2. Klikni na "Projects" tab
  3. Create new project → Kanban template
  4. Kolone: To Do → In Progress → Done
  5. Dodaj issues kao taskove

#### 2. **Trello**

- **Link**: https://trello.com
- **Prednosti**:
  - Vizuelni Kanban board
  - Besplatan do 10 boards
  - Power-Ups za integracije
  - Jednostavan UI
- **Mane**: Nije integrisano sa GitHub

#### 3. **ClickUp**

- **Link**: https://clickup.com
- **Prednosti**:
  - Besplatan plan (100MB storage)
  - Moćne funkcionalnosti
  - Gantt charts, Kanban, Liste
  - Time tracking
- **Mane**: Može biti overwhelming za solo projekte

#### 4. **Linear**

- **Link**: https://linear.app
- **Prednosti**:
  - Moderan UI
  - GitHub integracija
  - Besplatan za solo developere
  - Keyboard shortcuts
- **Mane**: Limitirano na manje timove

#### 5. **Notion**

- **Link**: https://notion.so
- **Prednosti**:
  - All-in-one workspace
  - Dokumentacija + Tasks
  - Besplatan za personal use
  - Fleksibilne baze podataka
- **Mane**: Nije specijalizovan za dev

---

## 🎯 Sledeći Koraci

### Faza 1: Setup i Autentifikacija

- [ ] Kreirati GitHub Project board
- [ ] Setup MySQL bazu
- [ ] Implementirati user model (backend)
- [ ] Implementirati business model (backend)
- [ ] Auth API endpoints:
  - [ ] POST /auth/register (client)
  - [ ] POST /auth/register/business
  - [ ] POST /auth/login
  - [ ] POST /auth/logout
  - [ ] POST /auth/forgot-password
  - [ ] POST /auth/reset-password
  - [ ] GET/POST /auth/verify-email
- [ ] Auth komponente (frontend):
  - [ ] LoginComponent
  - [ ] RegisterComponent (sa tab-ovima za tip korisnika)
  - [ ] ForgotPasswordComponent
  - [ ] ResetPasswordComponent
  - [ ] EmailVerificationComponent
- [ ] Route guards za zaštitu ruta
- [ ] Role-based routing (client/business/admin)

### Faza 2: Korisničke Sekcije

- [ ] Client Dashboard
- [ ] Business Admin Panel
- [ ] Super Admin Panel (opciono za MVP)

### Faza 3: Core Funkcionalnosti

- [ ] Biznis profil + usluge
- [ ] Kalendar i dostupnost
- [ ] Zakazivanje termina
- [ ] Notifikacije

---

## 📝 Beleške i Odluke

### Baza Podataka

#### Users Tabela - Ažurirano

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  role ENUM('client', 'provider', 'admin') NOT NULL,
  avatar VARCHAR(255),
  is_email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token VARCHAR(255),
  password_reset_token VARCHAR(255),
  password_reset_expires DATETIME,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### Businesses Tabela - Ažurirano

```sql
CREATE TABLE businesses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  owner_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  pib VARCHAR(20),
  registration_number VARCHAR(50),
  address VARCHAR(255),
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Serbia',
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  business_phone VARCHAR(20),
  business_email VARCHAR(255),
  website VARCHAR(255),
  logo VARCHAR(255),
  cover_image VARCHAR(255),
  description TEXT,
  category VARCHAR(100),
  is_approved BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  rating DECIMAL(3, 2) DEFAULT 0,
  review_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_city (city),
  INDEX idx_category (category),
  INDEX idx_approved (is_approved)
);
```

### APR Integracija (Opciono - za budućnost)

- APR API: https://www.apr.gov.rs/
- Omogućava automatsko popunjavanje podataka o firmi na osnovu PIB-a
- Za MVP: Ručno unošenje podataka

---

## 🔧 Tehnički Detalji

### Email Servisi (za verifikaciju i reset password)

**Opcije**:

1. **SendGrid** - 100 emails/dan besplatno
2. **Mailgun** - 5000 emails/mesec besplatno prvi 3 meseca
3. **Nodemailer + Gmail SMTP** - besplatno, ali limitirano

**Preporuka**: Nodemailer za development, SendGrid za production

### File Upload (slike - logo, cover)

**Opcije**:

1. **Cloudinary** - 25GB storage besplatno
2. **AWS S3** - Pay as you go
3. **Local storage** - za development

**Preporuka**: Cloudinary (jednostavno, besplatno za početak)

---

## 📌 GitHub Issues Template Predlog

### Feature Request Template

```markdown
## Feature: [Naziv Feature-a]

### Opis

[Detaljan opis šta treba implementirati]

### User Story

Kao [tip korisnika], želim [akcija], da bih [cilj].

### Acceptance Criteria

- [ ] Kriterijum 1
- [ ] Kriterijum 2
- [ ] Kriterijum 3

### Technical Notes

[Tehnički detalji, API endpoints, komponente...]

### Priority

- [ ] High
- [ ] Medium
- [ ] Low
```

### Bug Report Template

```markdown
## Bug: [Kratak opis]

### Kako reprodukovati

1. Step 1
2. Step 2
3. Step 3

### Očekivano ponašanje

[Šta bi trebalo da se desi]

### Stvarno ponašanje

[Šta se zapravo dešava]

### Screenshots

[Ako je moguće]

### Environment

- Browser: [Chrome/Firefox/...]
- OS: [Windows/Mac/Linux]
- Version: [verzija aplikacije]
```

---

## 🎨 UI/UX Napomene

### Design System

- **Primarna boja**: Indigo (#3F51B5) - Material Design
- **Akcent boja**: Pink (#E91E63)
- **Font**: Roboto (Material Design default)

### Responsive Breakpoints

- Mobile: 0-599px
- Tablet: 600-1023px
- Desktop: 1024px+

### Angular Material Komponente koje ćemo koristiti

- MatButton, MatIconButton
- MatFormField, MatInput
- MatSelect, MatDatepicker
- MatDialog
- MatSnackBar (za notifications)
- MatTable, MatPaginator
- MatToolbar, MatSidenav
- MatCard
- MatTabs
- MatChip

---

## 📚 Dodatna Dokumentacija

### Eksterne Resurse

- [Angular Material](https://material.angular.io/)
- [Angular Best Practices](https://angular.dev/best-practices)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Sequelize Docs](https://sequelize.org/docs/v6/)
- [JWT.io](https://jwt.io/)

---

**Zadnja izmena**: April 7, 2026
**Autor**: Zakazivanje Dev Team
