# Zakazivanje - Platforma za Rezervaciju Termina

## 📋 Pregled Projekta

**Zakazivanje** je moderna platforma koja povezuje pružaoce usluga (frizerski saloni, restorani, kozmetički saloni, fitnes centri, itd.) sa klijentima koji žele da zakažu termine.

### 🎯 Cilj Projekta

Omogućiti jednostavno, brzo i efikasno zakazivanje termina uz maksimalnu fleksibilnost i korisničko iskustvo.

---

## 👥 Tipovi Korisnika

### 1. **Klijenti** (Potrošači Usluga)

**Registracija**:

- Email adresa
- Ime i prezime
- Telefon
- Lozinka

**Mogućnosti**:

- Pretražuju pružaoce usluga
- Zakazuju termine
- Upravljaju svojim rezervacijama
- Ostavljaju recenzije i ocene

**Post-login**: Redirect na korisnički dashboard (pretraga i zakazivanje)

### 2. **Pružaoci Usluga** (Business Owners)

**Registracija**:

- Lični podaci (ime, prezime, email, telefon)
- Podaci o firmi:
  - Naziv firme
  - PIB (Poreski identifikacioni broj)
  - Matični broj
  - Adresa i grad
  - Kontakt telefon firme
  - Email firme
  - Website (opciono)

**Mogućnosti**:

- Upravlja profilom biznisa i uslugama
- Upravlja radnim vremenom i dostupnostima
- Prima i upravlja rezervacijama
- Vidi statistike i izveštaje
- Dodaje i upravlja zaposlenima

**Post-login**: Redirect na admin panel (upravljanje biznisom)

### 3. **Super Administratori**

**Mogućnosti**:

- Upravlja platformom
- Odobrava nove pružaoce usluga
- Moderira sadržaj i recenzije
- Vidi globalne statistike
- Upravlja korisnicima i biznesima

**Post-login**: Redirect na super admin panel

---

## 🔐 Autentifikacija (Auth Sekcija)

### Stranice

#### 1. Login (`/login`)

- Email/username input
- Password input
- "Zapamti me" checkbox
- Link ka "Zaboravili ste lozinku?"
- Link ka registraciji
- Opciono: Social login (Google, Facebook)

#### 2. Registracija (`/register`)

- Izbor tipa korisnika (Tab switcher):
  - **Korisnik** - Jednostavna forma
  - **Pružalac usluga** - Forma sa podacima o firmi
- Email verifikacija nakon registracije
- Redirect na verification poruku

#### 3. Forgot Password (`/forgot-password`)

- Email input
- Slanje reset linka na email
- Link nazad na login

#### 4. Reset Password (`/reset-password`)

- Token iz URL-a (query param)
- Nova lozinka
- Potvrda nove lozinke
- Password strength indicator

#### 5. Email Verification (`/verify-email/:token`)

- Automatska verifikacija
- Success/Error poruka
- Auto redirect na login

### Flow Dijagram

```
Registracija → Email Verification → Login → Dashboard (po roli)
                                      ↓
                        Client Dashboard / Business Admin / Super Admin
```

---

## 🎨 Osnovne Funkcionalnosti

### Za Klijente

#### 🔍 Pretraga i Filtriranje

- [ ] Pretraga po tipu usluge (frizerski salon, restoran, spa...)
- [ ] Filtriranje po lokaciji (grad, opština, radius)
- [ ] Filtriranje po ceni
- [ ] Filtriranje po ocenama
- [ ] Filtriranje po dostupnosti (danas, sutra, ovaj vikend...)
- [ ] Sortiranje rezultata (po relevantnosti, oceni, ceni, udaljenosti)

#### 📅 Zakazivanje Termina

- [ ] Pregled kalendara dostupnih termina
- [ ] Odabir specifične usluge
- [ ] Odabir zaposlenog (opciono)
- [ ] Odabir datuma i vremena
- [ ] Instant potvrda ili zahtev za potvrdu
- [ ] Email i SMS notifikacije
- [ ] Dodavanje u kalendar (Google Calendar, Outlook)

#### 👤 Korisnički Profil

- [ ] Registracija i prijava (email, Google, Facebook)
- [ ] Upravljanje ličnim podacima
- [ ] Istorija rezervacija
- [ ] Aktivne rezervacije
- [ ] Omiljeni pružaoci usluga
- [ ] Upravljanje notifikacijama

#### 📝 Recenzije i Ocene

- [ ] Ostavljanje recenzije nakon usluge
- [ ] Ocenjivanje (1-5 zvezda)
- [ ] Pregled tuđih recenzija
- [ ] Filtriranje recenzija

#### 🔔 Notifikacije

- [ ] Potvrda rezervacije
- [ ] Podsetnik (24h, 2h pre termina)
- [ ] Otkazivanje od strane pružaoca
- [ ] Promena termina

### Za Pružaoce Usluga

#### 🏢 Profil Biznisa

- [ ] Kreiranje i editovanje profila
- [ ] Dodavanje fotografija
- [ ] Opis biznisa
- [ ] Lokacija (adresa, mapa)
- [ ] Kontakt informacije
- [ ] Radno vreme

#### 💼 Upravljanje Uslugama

- [ ] Dodavanje usluga
- [ ] Definisanje trajanja usluge
- [ ] Definisanje cene
- [ ] Kategorije usluga
- [ ] Opciono: dodavanje zaposlenih za specifične usluge

#### 👥 Upravljanje Zaposlenima

- [ ] Dodavanje članova tima
- [ ] Dodela usluga zaposlenima
- [ ] Radno vreme po zaposlenom
- [ ] Godišnji odmori i slobodni dani

#### 📆 Kalendar i Dostupnost

- [ ] Pregled kalendara rezervacija
- [ ] Blokiranje termina (pauze, sastanci...)
- [ ] Definisanje radnog vremena
- [ ] Definisanje praznika/nerадnih dana
- [ ] Pregled dnevnih/nedeljnih/mesečnih rezervacija

#### 📊 Rezervacije

- [ ] Lista nadolazećih rezervacija
- [ ] Lista prošlih rezervacija
- [ ] Prihvatanje/odbijanje zahteva
- [ ] Otkazivanje rezervacija
- [ ] Izmena termina
- [ ] Ručno dodavanje rezervacija

#### 📈 Statistika i Izveštaji

- [ ] Broj rezervacija po periodu
- [ ] Prihodi po periodu
- [ ] Najtraženije usluge
- [ ] Prosečna ocena
- [ ] Stopa otkazivanja
- [ ] Peak times (najzauzetiji periodi)

#### 💬 Komunikacija

- [ ] Chat sa klijentima
- [ ] Slanje notifikacija klijentima
- [ ] Odgovaranje na recenzije

### Za Administratore

#### 🛠️ Upravljanje Platformom

- [ ] Pregled svih korisnika
- [ ] Pregled svih biznisa
- [ ] Odobravanje novih biznisa
- [ ] Moderacija recenzija
- [ ] Banovanje korisnika/biznisa

#### 📊 Globalna Statistika

- [ ] Ukupan broj korisnika
- [ ] Ukupan broj biznisa
- [ ] Ukupan broj rezervacija
- [ ] Najaktivnije kategorije
- [ ] Growth metrics

---

## 🔧 Tehnički Zahtevi

### Frontend (Angular)

- **Framework**: Angular 18+
- **State Management**: Signals
- **Forms**: Reactive Forms
- **UI Library**: Angular Material
- **Architecture**: Standalone Components
- **HTTP**: HttpClient sa Interceptors
- **Routing**: Lazy Loading

### Backend (Node.js)

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: MySQL 8+
- **ORM**: Sequelize ili TypeORM
- **Authentication**: JWT
- **Validation**: Joi ili class-validator
- **File Upload**: Multer (za slike)

### DevOps

- **Version Control**: Git + GitHub
- **CI/CD**: GitHub Actions
- **Hosting**:
  - Frontend: Vercel/Netlify
  - Backend: Railway/Render/DigitalOcean
  - Database: PlanetScale/Railway

---

## 📦 Faze Razvoja

### Faza 1: MVP (Minimum Viable Product)

**Cilj**: Osnovna funkcionalnost za testiranje tržišta

#### Frontend

- [ ] Landing page
- [ ] Registracija i prijava korisnika
- [ ] Pretraga pružalaca usluga
- [ ] Pregled profila pružaoca
- [ ] Zakazivanje termina
- [ ] Korisnički dashboard

#### Backend

- [ ] User authentication (JWT)
- [ ] User CRUD
- [ ] Business CRUD
- [ ] Service CRUD
- [ ] Appointment CRUD
- [ ] Database setup

### Faza 2: Proširene Funkcionalnosti

- [ ] Notifikacije (email, SMS)
- [ ] Recenzije i ocene
- [ ] Favoriti
- [ ] Chat sistem
- [ ] Upload slika
- [ ] Google Maps integracija

### Faza 3: Napredne Funkcionalnosti

- [ ] Payment integracija
- [ ] Advanced analytics
- [ ] Mobile aplikacija (opciono)
- [ ] Multi-language support
- [ ] API za treće strane

---

## 🗃️ Struktura Baze Podataka (Inicijalni Model)

### Users

```sql
id, email, password, firstName, lastName, phone, role (client/provider/admin),
avatar, createdAt, updatedAt
```

### Businesses

```sql
id, ownerId (FK-Users), name, description, category, address, city, country,
lat, lng, phone, email, website, logo, coverImage, rating, reviewCount,
createdAt, updatedAt
```

### Services

```sql
id, businessId (FK-Businesses), name, description, duration (minutes),
price, category, isActive, createdAt, updatedAt
```

### Employees

```sql
id, businessId (FK-Businesses), userId (FK-Users), name, position, avatar,
isActive, createdAt, updatedAt
```

### Appointments

```sql
id, businessId (FK-Businesses), serviceId (FK-Services), clientId (FK-Users),
employeeId (FK-Employees), date, startTime, endTime, status (pending/confirmed/cancelled/completed),
notes, createdAt, updatedAt
```

### BusinessHours

```sql
id, businessId (FK-Businesses), dayOfWeek (0-6), openTime, closeTime,
isClosed, createdAt, updatedAt
```

### Reviews

```sql
id, businessId (FK-Businesses), userId (FK-Users), appointmentId (FK-Appointments),
rating (1-5), comment, createdAt, updatedAt
```

### Favorites

```sql
id, userId (FK-Users), businessId (FK-Businesses), createdAt
```

---

## 🎨 Design Sistem

### Boje (Material Design)

- **Primary**: Indigo - `#3F51B5`
- **Accent**: Pink - `#E91E63`
- **Warn**: Red - `#F44336`
- **Success**: Green - `#4CAF50`

### Tipografija

- **Font Family**: Roboto (Material Design default)
- **Headings**: 500-700 weight
- **Body**: 400 weight

---

## 📱 Responsive Design

- **Desktop**: 1920px, 1440px, 1280px
- **Tablet**: 768px, 1024px
- **Mobile**: 320px, 375px, 414px

---

## 🔐 Sigurnost

### Backend

- [ ] JWT authentication
- [ ] Password hashing (bcrypt)
- [ ] Input validation i sanitization
- [ ] Rate limiting
- [ ] CORS policy
- [ ] SQL injection prevention
- [ ] XSS protection

### Frontend

- [ ] Route guards
- [ ] Token storage (httpOnly cookies ili localStorage sa enkripцijom)
- [ ] Input sanitization
- [ ] CSRF protection

---

## 🚀 Deployment Plan

### Development

- Frontend: `http://localhost:4200`
- Backend: `http://localhost:3000`

### Staging

- Frontend: `https://staging.zakazivanje.app`
- Backend: `https://api-staging.zakazivanje.app`

### Production

- Frontend: `https://zakazivanje.app`
- Backend: `https://api.zakazivanje.app`

---

## 📚 Dodatna Dokumentacija

- [CODING_RULES.md](../../CODING_RULES.md) - Pravila programiranja
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API dokumentacija (TBD)
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Detaljna šema baze (TBD)
- [FEATURES.md](./FEATURES.md) - Detaljni opisi feature-a (TBD)
- [TASKS.md](./TASKS.md) - Task breakdown (TBD)

---

**Verzija**: 1.0  
**Datum**: April 7, 2026  
**Status**: In Planning
