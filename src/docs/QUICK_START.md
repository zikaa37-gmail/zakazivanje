# Quick Start Guide - Zakazivanje Platforma

> Brzi vodič za pokretanje projekta i početak razvoja

---

## 🚀 Za Potpune Početnike

### 1. Preduslovi - Instaliraj Software

#### Node.js

```bash
# Proveri da li je instaliran
node --version
npm --version

# Ako nije, preuzmi sa:
# https://nodejs.org/ (preporučena LTS verzija)
```

#### Angular CLI

```bash
npm install -g @angular/cli
ng version
```

#### MySQL

```bash
# Preuzmi sa: https://dev.mysql.com/downloads/installer/
# Tokom instalacije zapamti:
# - Root password
# - Port (default 3306)
```

#### Git

```bash
git --version

# Ako nije instaliran:
# https://git-scm.com/downloads
```

---

## 📥 Clone Repository

```bash
# Clone projekat
git clone https://github.com/zikaa37-gmail/zakazivanje.git

# Uđi u folder
cd zakazivanje
```

---

## 🎨 Frontend Setup (Angular)

### 1. Instalacija

```bash
# U root folderu projekta
npm install
```

### 2. Pokretanje

```bash
# Development server
ng serve

# Ili sa custom portom
ng serve --port 4300
```

**Aplikacija**: http://localhost:4200

### 3. Build za Produkciju

```bash
ng build --configuration production
```

Output: `dist/` folder

---

## ⚙️ Backend Setup (Node.js)

### 1. MySQL Baza

**Kreiraj bazu**:

```sql
-- Otvori MySQL Workbench ili command line
mysql -u root -p

-- Unesi password, pa kreiraj bazu
CREATE DATABASE zakazivanje_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Proveri
SHOW DATABASES;
```

### 2. Environment Konfiguracija

```bash
cd server

# Kopiraj primer env fajla
cp .env.development .env

# Edituj .env fajl
# Postavi svoje kredencijale za MySQL
```

**Sadržaj `.env` fajla**:

```env
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tvoj_mysql_password
DB_NAME=zakazivanje_dev

JWT_SECRET=promeni-ovo-u-neki-random-string-12345
JWT_EXPIRES_IN=7d

CORS_ORIGIN=*
```

### 3. Instalacija

```bash
# U server folderu
npm install
```

### 4. Pokretanje

```bash
# Development mode (auto-restart sa nodemon)
npm run dev

# Production mode
npm run build
npm start
```

**Server**: http://localhost:3000

**Health check**: http://localhost:3000/health

---

## ✅ Provera da Sve Radi

### Frontend (Angular)

1. Otvori: http://localhost:4200
2. Trebalo bi da vidiš header, footer i "Dobrodošli" poruku

### Backend (Node.js)

1. Otvori: http://localhost:3000/health
2. Trebalo bi da vidiš JSON:

```json
{
  "status": "OK",
  "timestamp": "2026-04-07T...",
  "environment": "development"
}
```

### MySQL Baza

```bash
# U terminalu
mysql -u root -p

# U MySQL shellu
USE zakazivanje_dev;
SHOW TABLES;

# Trebalo bi da vidiš praznu listu (još nema tabela)
# Tabele će biti kreirane automatski kad pokrenemo server
```

---

## 🛠️ Development Workflow

### 1. GitHub Project Setup

Prati vodič: [GITHUB_SETUP.md](./GITHUB_SETUP.md)

```bash
# Básic steps:
# 1. Idi na: https://github.com/zikaa37-gmail/zakazivanje
# 2. Klikni "Projects" → "New project"
# 3. Odaberi "Board" template
# 4. Dodaj kolone: Backlog, To Do, In Progress, Done
```

### 2. Kreiranje Novog Feature-a

```bash
# 1. Kreiraj issue na GitHub-u
# 2. Assignuj sebi
# 3. Premesti u "To Do"

# 4. Kreiraj branch
git checkout -b feature/naziv-feature-a

# 5. Radi na feature-u...

# 6. Commituj promene
git add .
git commit -m "feat: dodaj login komponentu"

# 7. Push na GitHub
git push origin feature/naziv-feature-a

# 8. Kreiraj Pull Request na GitHub-u
# 9. Merge u main
```

### 3. Task Priority (Šta Prvo?)

**Trenutno stanje**: ✅ Projekat setup završen

**Sledeći koraci** (po prioritetu):

1. **Auth Backend** (Week 1)
   - [ ] User model
   - [ ] Business model
   - [ ] Auth service (register, login, verify email)
   - [ ] Auth API endpoints
   - [ ] Email servis (nodemailer)

2. **Auth Frontend** (Week 2)
   - [ ] Login komponenta
   - [ ] Register komponenta (sa tab-ovima)
   - [ ] Auth service (frontend)
   - [ ] Route guards
   - [ ] Forgot/Reset password

3. **Client Dashboard** (Week 3)
   - [ ] Dashboard layout
   - [ ] Search biznisa
   - [ ] Profil

4. **Business Admin** (Week 4)
   - [ ] Admin dashboard
   - [ ] Biznis profil
   - [ ] Services CRUD

Detaljnije: [TASKS.md](./TASKS.md)

---

## 📚 Dokumentacija

Sve što trebaš:

1. **[CODING_RULES.md](../../CODING_RULES.md)** - Pravila kodiranja (OBAVEZNO ČITANJE!)
2. **[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)** - Pregled projekta i funkcionalnosti
3. **[DEVELOPMENT_NOTES.md](./DEVELOPMENT_NOTES.md)** - Razvojne napomene i odluke
4. **[TASKS.md](./TASKS.md)** - Task breakdown po Epic-ima
5. **[GITHUB_SETUP.md](./GITHUB_SETUP.md)** - GitHub Projects vodič

---

## 🆘 Troubleshooting

### Frontend greške

**Problem**: `ng: command not found`

```bash
# Rešenje: Instaliraj Angular CLI
npm install -g @angular/cli
```

**Problem**: `Port 4200 is already in use`

```bash
# Rešenje: Koristi drugi port
ng serve --port 4300
```

**Problem**: Module not found errors

```bash
# Rešenje: Reinstaliraj dependencies
rm -rf node_modules package-lock.json
npm install
```

### Backend greške

**Problem**: `Cannot connect to database`

```bash
# Rešenje: Proveri da li MySQL radi
# Windows: Service → MySQL80 → Start
# Mac: brew services start mysql

# Proveri kredencijale u .env fajlu
```

**Problem**: `Port 3000 is already in use`

```bash
# Rešenje 1: Koristi drugi port u .env
PORT=3001

# Rešenje 2: Zaustavi proces na portu 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F

# Mac/Linux:
lsof -i :3000
kill -9 <PID_NUMBER>
```

**Problem**: `Cannot find module 'express'`

```bash
# Rešenje: Reinstaliraj dependencies
cd server
rm -rf node_modules package-lock.json
npm install
```

### MySQL greške

**Problem**: `Access denied for user 'root'@'localhost'`

```bash
# Rešenje: Resetuj MySQL password ili koristi tačan password u .env
```

**Problem**: `Database 'zakazivanje_dev' doesn't exist`

```bash
# Rešenje: Kreiraj bazu
mysql -u root -p
CREATE DATABASE zakazivanje_dev;
```

---

## 💡 Pro Tips

### VS Code Extensions (Preporučeno)

```
1. Angular Language Service
2. ESLint
3. Prettier - Code formatter
4. GitLens
5. Auto Rename Tag
6. Path Intellisense
7. Angular Schematics
8. Thunder Client (za testiranje API-ja)
```

### Keyboard Shortcuts (VS Code)

```
Ctrl + P        - Quick file open
Ctrl + Shift + P - Command palette
Ctrl + `        - Toggle terminal
Ctrl + B        - Toggle sidebar
Alt + ↑/↓       - Move line up/down
Ctrl + /        - Toggle comment
F2              - Rename variable
Ctrl + Space    - Trigger autocomplete
```

### Git Shortcuts

```bash
# Dodaj alias u .bashrc ili .zshrc
alias gs='git status'
alias ga='git add .'
alias gc='git commit -m'
alias gp='git push'
alias gl='git log --oneline --graph --decorate'
alias gb='git branch'
alias gco='git checkout'
```

### Angular CLI Generators

```bash
# Kreiranje komponente
ng g c features/auth/login --standalone

# Kreiranje servisa
ng g s core/services/auth

# Kreiranje guard-a
ng g guard core/guards/auth --functional

# Kreiranje interceptor-a
ng g interceptor core/interceptors/auth --functional
```

---

## 🎯 Sledeći Konkretni Korak

**Danas (April 7, 2026)**:

1. ✅ Proveri da frontend i backend rade
2. ✅ Kreiraj GitHub Project board
3. ✅ Dodaj prvi issue: "Implementirati User model (backend)"
4. ✅ Kreiraj branch: `feature/user-model`
5. ✅ Započni rad! 🚀

**Sutra**:

- Review CODING_RULES.md
- Implementiraj User i Business modele
- Setup Sequelize migracije

**Ova nedelja**:

- Završi Auth backend (modeli, API, email)

**Sledeća nedelja**:

- Započni Auth frontend (komponente, forme, guards)

---

## 📞 Help & Support

**Dokumentacija**:

- Angular: https://angular.dev/
- Express: https://expressjs.com/
- Sequelize: https://sequelize.org/
- MySQL: https://dev.mysql.com/doc/

**Community**:

- Stack Overflow
- Angular Discord
- GitHub Discussions

---

**Srećno sa razvojem! 🎉**

_Ako naiđeš na neki problem, proveri dokumentaciju ili kreiraj issue na GitHub-u._

---

**Verzija**: 1.0  
**Datum**: April 7, 2026
