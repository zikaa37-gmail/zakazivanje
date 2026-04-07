# Zakazivanje - Platforma za Rezervaciju Termina

Moderna platforma za zakazivanje termina koja povezuje pružaoce usluga (frizerski saloni, restorani, kozmetički saloni, fitness centri...) sa klijentima.

## 📁 Struktura Projekta

```
zakazivanje/
├── src/                          # Angular Frontend
│   ├── app/                      # App konfiguracija
│   ├── features/                 # Feature moduli
│   │   ├── home/
│   │   ├── auth/
│   │   ├── search/
│   │   ├── appointments/
│   │   └── ...
│   ├── core/                     # Core funkcionalnosti
│   │   ├── interceptors/
│   │   ├── guards/
│   │   └── services/
│   ├── shared/                   # Reusable komponente
│   │   ├── components/
│   │   └── models/
│   ├── docs/                     # Dokumentacija
│   └── environments/             # Environment konfiguracija
│
├── server/                       # Node.js Backend
│   ├── src/
│   │   ├── features/            # Feature moduli
│   │   ├── core/                # Core funkcionalnosti
│   │   └── shared/              # Zajedničke utilities
│   ├── .env.development         # Dev environment
│   └── .env.production          # Production environment
│
├── CODING_RULES.md              # Pravila programiranja
└── README.md                    # Ova datoteka
```

## 🚀 Pokretanje Projekta

### Preduslovi

- **Node.js**: v20+ ([Download](https://nodejs.org/))
- **npm**: v9+ (dolazi sa Node.js)
- **Angular CLI**: v18+ (`npm install -g @angular/cli`)
- **MySQL**: v8+ ([Download](https://dev.mysql.com/downloads/installer/))
- **Git**: ([Download](https://git-scm.com/downloads))

### Frontend (Angular)

1. **Instalacija zavisnosti**:

   ```bash
   npm install
   ```

2. **Pokretanje development servera**:

   ```bash
   ng serve
   ```

   Aplikacija će biti dostupna na `http://localhost:4200`

3. **Build za produkciju**:
   ```bash
   ng build --configuration production
   ```

### Backend (Node.js)

1. **Navigacija u server folder**:

   ```bash
   cd server
   ```

2. **Instalacija zavisnosti**:

   ```bash
   npm install
   ```

3. **Konfiguracija baze podataka**:
   - Kreiraj MySQL bazu: `zakazivanje_dev`
   - Kopiraj `.env.development` i konfiguriši parametre:
     ```env
     DB_HOST=localhost
     DB_USER=root
     DB_PASSWORD=your_password
     DB_NAME=zakazivanje_dev
     JWT_SECRET=your_secret_key
     ```

4. **Pokretanje development servera**:

   ```bash
   npm run dev
   ```

   Server će biti pokrenut na `http://localhost:3000`

5. **Build za produkciju**:
   ```bash
   npm run build
   npm start
   ```

## 📚 Dokumentacija

- **[CODING_RULES.md](./CODING_RULES.md)** - Detaljnа pravila programiranja i best practices
- **[PROJECT_OVERVIEW.md](./src/docs/PROJECT_OVERVIEW.md)** - Pregled projekta, funkcionalnosti i roadmap

## 🛠️ Tehnologije

### Frontend

- **Angular 18+** - Framework
- **TypeScript** - Programski jezik
- **Angular Material** - UI komponente
- **RxJS** - Reactive programming
- **Signals** - State management

### Backend

- **Node.js 20+** - Runtime
- **Express.js** - Web framework
- **MySQL** - Baza podataka
- **Sequelize** - ORM
- **JWT** - Autentifikacija
- **Joi** - Validacija

## 🎯 Sledeći Koraci

### 1. Podešavanje MySQL baze

Kreiraj bazu podataka:

```sql
CREATE DATABASE zakazivanje_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. GitHub Repository Setup

Inicijalizuj Git repo (već urađeno):

```bash
git init
```

Dodaj remote repository:

```bash
git remote add origin https://github.com/zikaa37-gmail/zakazivanje.git
```

Kreiraj inicial commit:

```bash
git add .
git commit -m "Initial commit: Project structure"
git branch -M main
git push -u origin main
```

### 3. Razvoj Funkcionalnosti

Počni sa MVP Feature-ima (po prioritetu):

1. **Autentifikacija** (`features/auth`)
   - Login
   - Registracija
   - JWT token management

2. **Korisnički Profili** (`features/profile`)
   - User CRUD
   - Profile management

3. **Biznis Profili** (`features/business`)
   - Business CRUD
   - Service management

4. **Zakazivanje** (`features/appointments`)
   - Calendar view
   - Booking functionality
   - Appointment management

## 🧪 Testiranje

### Frontend

```bash
ng test
```

### Backend

```bash
cd server
npm test
```

## 📝 Konvencije

### Git Commit Messages

```
feat: dodaj novu funkcionalnost
fix: ispravi bug
docs: ažuriraj dokumentaciju
refactor: refaktoriši kod
test: dodaj testove
style: formatiranje koda
```

### Branch Strategy

- `main` - production
- `develop` - development
- `feature/naziv-feature-a` - novi feature-i
- `bugfix/naziv-bug-a` - ispravke

### Kodiranje

Sledeći **[CODING_RULES.md](./CODING_RULES.md)** za sve konvencije:

- Standalone komponente
- Signali za state management
- Reaktivne forme
- OnPush Change Detection
- Funkcije umesto klasa za guards/interceptors

## 🤝 Doprinos

1. Fork projekat
2. Kreiraj feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit promene (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push na branch (`git push origin feature/AmazingFeature`)
5. Otvori Pull Request

## 📧 Kontakt

Email: zikaa37@gmail.com

## 📄 Licenca

MIT License - slobodno koristite za lične i komercijalne projekte.

---

**Verzija**: 1.0.0  
**Datum**: April 7, 2026  
**Status**: In Development
