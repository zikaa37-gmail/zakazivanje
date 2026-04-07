# Database Schema - Zakazivanje Platforma

> **Verzija**: 2.0  
> **Status**: Draft - Za Review  
> **Datum**: April 7, 2026

---

## 🎯 Strategija

### Problem

Imamo **dva različita tipa korisnika** sa različitim podacima:

1. **Klijenti** - samo osnovni podaci (ime, email, telefon)
2. **Pružaoci usluga** - osnovi podaci + detaljni podaci o firmi + lokacije

### Dodatni Zahtevi

- ✅ **Jedan vlasnik može imati više biznisa** (npr. različite franšize)
- ✅ **Svaki biznis može imati više lokacija** (npr. salon u više gradova)
- ✅ **Soft delete** - nikad hard delete, koristimo `is_active`
- ✅ **WhatsApp** - primarna komunikacija (+ email za backup)

### Rešenje: Users → Businesses → Locations Model

```
┌──────────┐
│  users   │ ← Osnovna autentifikacija za SVE korisnike
└──────────┘
     │
     │ (1-to-many za business owners)
     ▼
┌──────────┐
│businesses│ ← Firma/kompanija (može više po vlasniku)
└──────────┘
     │
     │ (1-to-many)
     ▼
┌──────────┐
│locations │ ← Fizičke lokacije salona (može više po bizuisu)
└──────────┘
     │
     └──► services, employees, appointments (vezani za lokaciju)
```

**Primer**:

```
Vlasnik: Marko Marković
  ├─ Biznis: "Lux Saloni d.o.o."
  │    ├─ Lokacija: Lux Salon Beograd (Vračar)
  │    ├─ Lokacija: Lux Salon Novi Sad
  │    └─ Lokacija: Lux Salon Niš
  │
  └─ Biznis: "Beauty Center MC"
       └─ Lokacija: Beauty Center Zemun
```

**Prednosti**:

- ✅ Fleksibilnost za razne scenarije
- ✅ Čisto razdvajanje (business = pravni entitet, location = fizičko mesto)
- ✅ Lakše za skaliranje
- ✅ Zasebna statistika po bizuisu i po lokaciji

---

## 📊 Core Tabele

### 1. **users** - Svi Korisnici (Autentifikacija)

```sql
CREATE TABLE users (
  -- Primary
  id INT PRIMARY KEY AUTO_INCREMENT,

  -- Auth
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,

  -- Personal Info
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  avatar VARCHAR(255),

  -- Role & Status
  role ENUM('client', 'business_owner', 'admin') NOT NULL DEFAULT 'client',
  is_active BOOLEAN DEFAULT TRUE,

  -- Email Verification
  is_email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token VARCHAR(255),
  email_verification_expires DATETIME,

  -- Password Reset
  password_reset_token VARCHAR(255),
  password_reset_expires DATETIME,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,

  -- Indexes
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Polja**:

| Field                        | Type         | Description                     |
| ---------------------------- | ------------ | ------------------------------- |
| `id`                         | INT          | Primary key                     |
| `email`                      | VARCHAR(255) | Unique, za login                |
| `password`                   | VARCHAR(255) | Hashed (bcrypt)                 |
| `first_name`                 | VARCHAR(100) | Ime korisnika                   |
| `last_name`                  | VARCHAR(100) | Prezime korisnika               |
| `phone`                      | VARCHAR(20)  | Telefon (opciono)               |
| `avatar`                     | VARCHAR(255) | URL do profilne slike           |
| `role`                       | ENUM         | client / business_owner / admin |
| `is_active`                  | BOOLEAN      | Da li je nalog aktivan          |
| `is_email_verified`          | BOOLEAN      | Da li je email verifikovan      |
| `email_verification_token`   | VARCHAR(255) | Token za verifikaciju           |
| `email_verification_expires` | DATETIME     | Istek tokena                    |
| `password_reset_token`       | VARCHAR(255) | Token za reset lozinke          |
| `password_reset_expires`     | DATETIME     | Istek reset tokena              |
| `created_at`                 | TIMESTAMP    | Kada je kreiran nalog           |
| `updated_at`                 | TIMESTAMP    | Poslednja izmena                |
| `last_login`                 | TIMESTAMP    | Poslednji login                 |

**Validacija**:

- Email: validan email format
- Password: minimum 8 karaktera, mora sadržati broj i slovo
- Phone: E.164 format (opciono)
- Role: mora biti jedan od dozvoljenih

---

### 2. **businesses** - Pružaoci Usluga

```sql
CREATE TABLE businesses (
  -- Primary
  id INT PRIMARY KEY AUTO_INCREMENT,

  -- Owner Reference
  owner_id INT NOT NULL,

  -- Business Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),

  -- Legal Info (Serbia specific)
  pib VARCHAR(20),
  registration_number VARCHAR(50),

  -- Location
  address VARCHAR(255),
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Serbia',
  postal_code VARCHAR(20),
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),

  -- Contact
  business_phone VARCHAR(20),
  business_email VARCHAR(255),
  website VARCHAR(255),

  -- Images
  logo VARCHAR(255),
  cover_image VARCHAR(255),

  -- Status
  is_approved BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  -- Ratings
  rating DECIMAL(3, 2) DEFAULT 0.00,
  review_count INT DEFAULT 0,

  -- Working Hours (JSON - fleksibilnije)
  working_hours JSON,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  approved_at TIMESTAMP NULL,
  approved_by INT NULL,

  -- Foreign Keys
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,

  -- Indexes
  INDEX idx_owner (owner_id),
  INDEX idx_city (city),
  INDEX idx_category (category),
  INDEX idx_approved (is_approved),
  INDEX idx_active (is_active),
  INDEX idx_rating (rating),
  FULLTEXT INDEX idx_search (name, description, city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Polja**:

| Field                        | Type           | Description                     |
| ---------------------------- | -------------- | ------------------------------- |
| `id`                         | INT            | Primary key                     |
| `owner_id`                   | INT            | FK → users.id                   |
| `name`                       | VARCHAR(255)   | Naziv firme/biznisa             |
| `description`                | TEXT           | Opis biznisa                    |
| `category`                   | VARCHAR(100)   | Kategorija (salon, restoran...) |
| `pib`                        | VARCHAR(20)    | Poreski identifikacioni broj    |
| `registration_number`        | VARCHAR(50)    | Matični broj firme              |
| `address`                    | VARCHAR(255)   | Adresa                          |
| `city`                       | VARCHAR(100)   | Grad                            |
| `country`                    | VARCHAR(100)   | Država (default Serbia)         |
| `postal_code`                | VARCHAR(20)    | Poštanski broj                  |
| `lat`, `lng`                 | DECIMAL        | Geografske koordinate           |
| `business_phone`             | VARCHAR(20)    | Telefon biznisa                 |
| `business_email`             | VARCHAR(255)   | Email biznisa                   |
| `website`                    | VARCHAR(255)   | Website URL                     |
| `logo`                       | VARCHAR(255)   | URL do logo-a                   |
| `cover_image`                | VARCHAR(255)   | URL do cover slike              |
| `is_approved`                | BOOLEAN        | Da li je admin odobrio          |
| `is_active`                  | BOOLEAN        | Da li je biznis aktivan         |
| `rating`                     | DECIMAL(3,2)   | Prosečna ocena (0.00-5.00)      |
| `review_count`               | INT            | Broj recenzija                  |
| `working_hours`              | JSON           | Radno vreme                     |
| `approved_at`, `approved_by` | TIMESTAMP, INT | Ko i kada odobrio               |

**working_hours JSON Format**:

```json
{
  "monday": { "open": "08:00", "close": "20:00", "closed": false },
  "tuesday": { "open": "08:00", "close": "20:00", "closed": false },
  "wednesday": { "open": "08:00", "close": "20:00", "closed": false },
  "thursday": { "open": "08:00", "close": "20:00", "closed": false },
  "friday": { "open": "08:00", "close": "20:00", "closed": false },
  "saturday": { "open": "09:00", "close": "18:00", "closed": false },
  "sunday": { "open": null, "close": null, "closed": true }
}
```

**Kategorije** (enum vrednosti za `category`):

- `hair_salon` - Frizerski salon
- `barber` - Berberin
- `beauty_salon` - Kozmetički salon
- `spa` - Spa & Wellness
- `nail_salon` - Salon za nokte
- `massage` - Masaža
- `tattoo` - Tetoviranje
- `dental` - Stomatologija
- `fitness` - Fitnes centar
- `personal_trainer` - Lični trener
- `restaurant` - Restoran
- `cafe` - Kafić
- `other` - Ostalo

---

### 3. **services** - Usluge koje Biznis Nudi

```sql
CREATE TABLE services (
  -- Primary
  id INT PRIMARY KEY AUTO_INCREMENT,

  -- Business Reference
  business_id INT NOT NULL,

  -- Service Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  duration INT NOT NULL, -- u minutima
  price DECIMAL(10, 2) NOT NULL,
  category VARCHAR(100),

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign Keys
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,

  -- Indexes
  INDEX idx_business (business_id),
  INDEX idx_active (is_active),
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Primer podataka**:

```
Frizerski salon "Lux"
├── Šišanje muško - 30min - 1500 RSD
├── Šišanje žensko - 60min - 3000 RSD
├── Farbanje - 120min - 5000 RSD
└── Feniranje - 30min - 1000 RSD
```

---

### 4. **employees** - Zaposleni u Bizuisu

```sql
CREATE TABLE employees (
  -- Primary
  id INT PRIMARY KEY AUTO_INCREMENT,

  -- Business Reference
  business_id INT NOT NULL,

  -- User Reference (opciono - ako zaposleni ima nalog)
  user_id INT NULL,

  -- Employee Info
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  avatar VARCHAR(255),
  position VARCHAR(100),

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Working Hours (JSON)
  working_hours JSON,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign Keys
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,

  -- Indexes
  INDEX idx_business (business_id),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 5. **employee_services** - Many-to-Many (Zaposleni ↔ Usluge)

```sql
CREATE TABLE employee_services (
  employee_id INT NOT NULL,
  service_id INT NOT NULL,

  PRIMARY KEY (employee_id, service_id),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Primer**: Zaposleni "Marko" može da radi:

- Šišanje muško
- Šišanje žensko
- Feniranje

---

### 6. **appointments** - Zakazani Termini

```sql
CREATE TABLE appointments (
  -- Primary
  id INT PRIMARY KEY AUTO_INCREMENT,

  -- References
  business_id INT NOT NULL,
  service_id INT NOT NULL,
  client_id INT NOT NULL,
  employee_id INT NULL,

  -- Appointment Details
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  -- Status
  status ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no_show') NOT NULL DEFAULT 'pending',

  -- Notes
  client_notes TEXT,
  business_notes TEXT,

  -- Cancellation
  cancelled_at TIMESTAMP NULL,
  cancelled_by ENUM('client', 'business') NULL,
  cancellation_reason TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign Keys
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL,

  -- Indexes
  INDEX idx_business (business_id),
  INDEX idx_client (client_id),
  INDEX idx_employee (employee_id),
  INDEX idx_date (appointment_date),
  INDEX idx_status (status),
  UNIQUE INDEX idx_employee_time (employee_id, appointment_date, start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Status Flow**:

```
pending → confirmed → completed
   ↓
cancelled
   ↓
no_show
```

---

### 7. **reviews** - Recenzije

```sql
CREATE TABLE reviews (
  -- Primary
  id INT PRIMARY KEY AUTO_INCREMENT,

  -- References
  business_id INT NOT NULL,
  user_id INT NOT NULL,
  appointment_id INT NULL,

  -- Review
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,

  -- Response
  response TEXT NULL,
  response_at TIMESTAMP NULL,

  -- Status
  is_approved BOOLEAN DEFAULT TRUE,
  is_reported BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign Keys
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,

  -- Indexes
  INDEX idx_business (business_id),
  INDEX idx_user (user_id),
  INDEX idx_rating (rating),

  -- One review per appointment
  UNIQUE INDEX idx_appointment (appointment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 8. **favorites** - Omiljeni Biznisi

```sql
CREATE TABLE favorites (
  -- Primary
  id INT PRIMARY KEY AUTO_INCREMENT,

  user_id INT NOT NULL,
  business_id INT NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Foreign Keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,

  -- Unique constraint
  UNIQUE INDEX idx_user_business (user_id, business_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 9. **business_images** - Galerija Slika

```sql
CREATE TABLE business_images (
  -- Primary
  id INT PRIMARY KEY AUTO_INCREMENT,

  business_id INT NOT NULL,

  -- Image Info
  url VARCHAR(255) NOT NULL,
  caption VARCHAR(255),
  display_order INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Foreign Keys
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,

  -- Indexes
  INDEX idx_business (business_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 10. **blocked_time_slots** - Blokirani Termini

```sql
CREATE TABLE blocked_time_slots (
  -- Primary
  id INT PRIMARY KEY AUTO_INCREMENT,

  -- References
  business_id INT NULL,
  employee_id INT NULL,

  -- Time Slot
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  -- Reason
  reason VARCHAR(255),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Foreign Keys
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,

  -- Indexes
  INDEX idx_business_date (business_id, date),
  INDEX idx_employee_date (employee_id, date),

  -- Either business or employee must be set
  CHECK ((business_id IS NOT NULL) OR (employee_id IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Primer upotrebe**:

- Pauza za ručak 12:00-13:00
- Godišnji odmor 01.08-15.08
- Sastanak 14:00-15:00

---

## 🔐 Auth Flow - Detaljno

### Registracija Klijenta

```
1. POST /api/auth/register
   Body: { email, password, firstName, lastName, phone }

2. Kreiranje user-a sa role='client'

3. Generisanje email_verification_token

4. Slanje verifikacionog email-a

5. Response: { success: true, message: "Check your email" }
```

### Registracija Pružaoca Usluga

```
1. POST /api/auth/register/business
   Body: {
     // User data
     email, password, firstName, lastName, phone,
     // Business data
     businessName, pib, registrationNumber, address, city,
     businessPhone, businessEmail, website
   }

2. Transakcija:
   a) Kreiranje user-a sa role='business_owner'
   b) Kreiranje business-a sa owner_id i is_approved=false

3. Generisanje email_verification_token

4. Slanje verifikacionog email-a + notifikacija admin-u

5. Response: { success: true, message: "Registration pending approval" }
```

### Login

```
1. POST /api/auth/login
   Body: { email, password }

2. Provera email + password

3. Provera is_email_verified === true

4. Provera is_active === true

5. Ažuriranje last_login

6. Generisanje JWT tokena:
   Payload: { userId, email, role, businessId (if business_owner) }

7. Response: {
     success: true,
     token: "jwt_token",
     user: { id, email, firstName, lastName, role },
     business: { ... } // ako je business_owner
   }
```

### Email Verification

```
1. GET /api/auth/verify-email/:token

2. Pronađi user-a sa email_verification_token

3. Proveri da token nije ekspiriran

4. Ažuriraj:
   is_email_verified = true
   email_verification_token = null

5. Redirect na frontend /login?verified=true
```

### Forgot Password

```
1. POST /api/auth/forgot-password
   Body: { email }

2. Pronađi user-a

3. Generiši password_reset_token i password_reset_expires (1h)

4. Pošalji email sa linkom:
   https://app.com/reset-password?token=xyz

5. Response: { success: true, message: "Reset link sent" }
```

### Reset Password

```
1. POST /api/auth/reset-password
   Body: { token, newPassword }

2. Pronađi user-a sa password_reset_token

3. Proveri da token nije ekspiriran

4. Hash novu lozinku

5. Ažuriraj:
   password = hashed
   password_reset_token = null
   password_reset_expires = null

6. Response: { success: true, message: "Password updated" }
```

---

## 📝 Sequelize Models Overview

```typescript
// User Model
User.hasOne(Business, { foreignKey: 'owner_id' });
User.hasMany(Appointment, { as: 'ClientAppointments', foreignKey: 'client_id' });
User.hasMany(Review, { foreignKey: 'user_id' });
User.hasMany(Favorite, { foreignKey: 'user_id' });

// Business Model
Business.belongsTo(User, { as: 'Owner', foreignKey: 'owner_id' });
Business.hasMany(Service, { foreignKey: 'business_id' });
Business.hasMany(Employee, { foreignKey: 'business_id' });
Business.hasMany(Appointment, { foreignKey: 'business_id' });
Business.hasMany(Review, { foreignKey: 'business_id' });
Business.hasMany(BusinessImage, { foreignKey: 'business_id' });

// Service Model
Service.belongsTo(Business, { foreignKey: 'business_id' });
Service.belongsToMany(Employee, { through: 'employee_services' });

// Employee Model
Employee.belongsTo(Business, { foreignKey: 'business_id' });
Employee.belongsToMany(Service, { through: 'employee_services' });
Employee.hasMany(Appointment, { foreignKey: 'employee_id' });

// Appointment Model
Appointment.belongsTo(Business, { foreignKey: 'business_id' });
Appointment.belongsTo(Service, { foreignKey: 'service_id' });
Appointment.belongsTo(User, { as: 'Client', foreignKey: 'client_id' });
Appointment.belongsTo(Employee, { foreignKey: 'employee_id' });
Appointment.hasOne(Review, { foreignKey: 'appointment_id' });
```

---

## 🚀 Sledeći Koraci

### Faza 1: Auth Setup (Tekuća)

1. ✅ Osmisliti strukturu baze
2. ⏳ Review i odobrenje šeme
3. ⏳ Implementirati Sequelize modele
4. ⏳ Kreirati migracije
5. ⏳ Auth API endpoints
6. ⏳ Email servis
7. ⏳ Testiranje

### Faza 2: Business Management

- CRUD za businesses
- CRUD za services
- Employees management

### Faza 3: Appointments

- Booking flow
- Availability logic
- Calendar view

---

## ❓ Pitanja za Razmatranje

1. **Jedan vlasnik - više biznisa?**
   - Da: User.hasMany(Business)
   - Ne: User.hasOne(Business) ✅ (trenutno)

2. **APR integracija?**
   - Auto-popunjavanje podataka o firmi
   - Za MVP: Ne, ručno unošenje
   - Post-MVP: Možda

3. **Multi-tenancy?**
   - Ako jedan biznis ima više lokacija
   - Za MVP: Ne
   - Post-MVP: Razmotriti

4. **Soft delete?**
   - Dodati `deleted_at` timestamp
   - Za MVP: Možda samo za kritične tabele (users, businesses)

5. **Notifikacije?**
   - Tabela za histo riju notifikacija?
   - Za MVP: Samo email
   - Post-MVP: In-app notifications tabela

---

**Status**: 🟡 Čeka Review  
**Sledeći korak**: Odobriti šemu i krenuti sa implementacijom modela
