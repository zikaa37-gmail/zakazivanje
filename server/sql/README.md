# SQL Skripta - Zakazivanje Platforma

## 📁 Struktura Fajlova

```
sql/
├── 00_create_database.sql      # Kreiranje dev i prod baze
├── 01_users.sql                # Korisnici (autentifikacija)
├── 02_businesses.sql           # Biznisi (pravni entiteti)
├── 03_business_locations.sql   # Lokacije biznisa
├── 04_services.sql             # Usluge koje biznisi nude
├── 05_employees.sql            # Zaposleni
├── 06_employee_services.sql    # Many-to-Many (Zaposleni ↔ Usluge)
├── 07_appointments.sql         # Zakazani termini
├── 08_reviews.sql              # Recenzije
├── 09_favorites.sql            # Omiljeni biznisi
├── 10_business_images.sql      # Galerija slika
├── 11_blocked_time_slots.sql   # Blokirani termini
└── README.md                   # Ova dokumentacija
```

## 🚀 Izvršavanje SQL Skripti

### Development Baza

```bash
# 1. Kreiraj bazu
mysql -u root -p < 00_create_database.sql

# 2. Selektuj dev bazu i izvrši skripte redom
mysql -u root -p zakazivanje_dev < 01_users.sql
mysql -u root -p zakazivanje_dev < 02_businesses.sql
mysql -u root -p zakazivanje_dev < 03_business_locations.sql
mysql -u root -p zakazivanje_dev < 04_services.sql
mysql -u root -p zakazivanje_dev < 05_employees.sql
mysql -u root -p zakazivanje_dev < 06_employee_services.sql
mysql -u root -p zakazivanje_dev < 07_appointments.sql
mysql -u root -p zakazivanje_dev < 08_reviews.sql
mysql -u root -p zakazivanje_dev < 09_favorites.sql
mysql -u root -p zakazivanje_dev < 10_business_images.sql
mysql -u root -p zakazivanje_dev < 11_blocked_time_slots.sql
```

### Production Baza

```bash
# 1. Kreiraj bazu
mysql -u root -p < 00_create_database.sql

# 2. Selektuj prod bazu i izvrši skripte redom
mysql -u root -p zakazivanje_prod < 01_users.sql
mysql -u root -p zakazivanje_prod < 02_businesses.sql
mysql -u root -p zakazivanje_prod < 03_business_locations.sql
# ... (sve ostale po redosledu)
```

### Alternativno - Batch Izvršavanje

```bash
# Linux/Mac
cd sql/
for f in *.sql; do mysql -u root -p zakazivanje_dev < "$f"; done

# Windows PowerShell
cd sql/
Get-ChildItem -Filter *.sql | ForEach-Object {
  mysql -u root -p zakazivanje_dev < $_.FullName
}
```

## 📊 Dijagram Relacija

```
users (1) ──────────> (N) businesses
                          │
                          │ (1)
                          ▼
                      (N) business_locations
                          │
                          ├──> (N) employees
                          ├──> (N) appointments
                          └──> (N) business_images

businesses (1) ──────> (N) services
employees (N) ←──────> (N) services (via employee_services)
appointments (N) ────> (1) service
appointments (N) ────> (1) client (user)
appointments (N) ────> (1) employee
appointments (1) ←──── (1) review

users (N) ←──────────> (N) businesses (via favorites)
```

## 🔑 Ključne Odluke

### Soft Delete

- **NIKAD ne brisati podatke hard delete**
- Sve tabele imaju `is_active` kolonu
- `WHERE is_active = TRUE` u svim query-ima

### WhatsApp Komunikacija

- `users.whatsapp_number` - WhatsApp korisnika
- `users.preferred_communication` - kako želi da prima notifikacije
- `businesses.business_whatsapp` - WhatsApp biznisa
- `business_locations.location_whatsapp` - WhatsApp specifične lokacije

### Multi-Location Support

- Jedan vlasnik → više biznisa
- Jedan biznis → više lokacija
- Zaposleni mogu raditi na više lokacija (ili svim)

### Indexes

- Svi foreign key-evi imaju indexe
- FULLTEXT indexi za pretragu (name, description, address, city)
- Composite indexi za često korišćene kombinacije

## ⚙️ Konfiguracija

### Character Set

- **utf8mb4** - podržava sve Unicode karaktere (emoji, ćiriličtinu)
- **utf8mb4_unicode_ci** - case-insensitive collation

### Engine

- **InnoDB** - podržava foreign keys, transakcije, bolji za konkurentnost

## 🧪 Testiranje

### Provera Strukture

```sql
USE zakazivanje_dev;

-- Prikaži sve tabele
SHOW TABLES;

-- Prikaži strukturu tabele
DESCRIBE users;
DESCRIBE businesses;
DESCRIBE business_locations;

-- Proveri foreign keys
SELECT
  TABLE_NAME,
  COLUMN_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'zakazivanje_dev'
  AND REFERENCED_TABLE_NAME IS NOT NULL;
```

### Test Podaci

```sql
-- Dodaj test korisnika
INSERT INTO users (email, password, first_name, last_name, phone, role)
VALUES ('test@example.com', '$2b$10$...hash...', 'Test', 'User', '+381601234567', 'client');

-- Dodaj test biznis
INSERT INTO businesses (owner_id, name, category, is_approved)
VALUES (1, 'Test Salon', 'hair_salon', TRUE);

-- Dodaj test lokaciju
INSERT INTO business_locations (business_id, name, address, city)
VALUES (1, 'Test Salon Beograd', 'Knez Mihailova 5', 'Beograd');
```

## 📚 Dodatne Informacije

- **DATABASE_SCHEMA.md** - Detaljna dokumentacija strukture baze
- **CODING_RULES.md** - Pravila kodiranja i soft delete policy
- **PROJECT_OVERVIEW.md** - Pregled projekta i funkcionalnosti

## 🔄 Update/Migration Strategy

Kada budeš praviti izmene na strukturi:

1. **NE MENJAJ postojeće SQL fajlove**
2. Kreiraj novi migration fajl: `12_add_column_xyz.sql`
3. Dokumentuj promene u `DATABASE_SCHEMA.md`
4. Ažuriraj Sequelize modele u backend-u

Primer migration fajla:

```sql
-- 12_add_column_xyz.sql
ALTER TABLE users
ADD COLUMN new_column VARCHAR(255) DEFAULT NULL
AFTER existing_column;
```

## ❗ Napomene

- **Redosled izvršavanja je BITAN** zbog foreign key constraints
- Tabele moraju biti kreirane u numeričkom redosledu fajlova
- Pre production deploy-a, napravi backup baze: `mysqldump -u root -p zakazivanje_prod > backup.sql`
