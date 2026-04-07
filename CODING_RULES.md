# Pravila Programiranja - Zakazivanje Platforma

## Angular Frontend

### Osnovni Principi

- **Uvek koristiti najsavremenije metode** u kodiranju
- **Standalone komponente** - bez NgModules
- **Signali** - za state management i reaktivnost
- **Reaktivne forme** - FormControl, FormGroup, FormBuilder
- **Angular Material** - za UI komponente
- **OnPush Change Detection** - za bolje performanse
- **Funkcije umesto klasa** - za guards, interceptors, resolvers

### Struktura Projekta

```
src/
├── app/                  # Samo app.config.ts, app.routes.ts, app.component.ts
├── auth/                 # Autentifikacija (poseban nivo)
│   ├── login/
│   ├── register/
│   ├── forgot-password/
│   ├── auth.service.ts
│   └── auth.model.ts
├── features/             # Feature moduli/komponente
│   ├── appointments/
│   ├── search/
│   ├── profile/
│   └── ...
├── core/                 # Zajednički servisi, interceptori, guards
│   ├── interceptors/
│   ├── guards/
│   ├── services/        # Samo globalni servisi (api.service, storage.service)
│   └── models/          # Zajednički modeli
├── shared/              # Reusable komponente
│   ├── components/
│   │   ├── header/
│   │   ├── footer/
│   │   └── ...
│   ├── directives/
│   ├── pipes/
│   └── utils/
└── docs/                # Dokumentacija
```

### Organizacija Fajlova - OBAVEZNO

**Pravilo**: Svi fajlovi jedne funkcionalnosti na JEDNOM mestu

#### 🏷️ Konvencija Imenovanja Fajlova - STROGO OBAVEZNO

**SVAKI** fajl **MORA** imati eksplicitnu oznaku tipa:

```
✅ DOBRO:
login.component.ts          # Komponenta
login.component.html        # Template komponente
login.component.scss        # Stilovi komponente
login.component.spec.ts     # Test komponente

auth.service.ts             # Servis
auth.service.spec.ts        # Test servisa

auth.model.ts               # Model/Interface
appointment.model.ts        # Model/Interface

auth.guard.ts               # Guard
http.interceptor.ts         # Interceptor
date.pipe.ts                # Pipe
click-outside.directive.ts  # Direktiva
form.validators.ts          # Validatori
string.utils.ts             # Utility funkcije
app.config.ts               # Konfiguracija
app.routes.ts               # Rutiranje

❌ LOŠE - Bez oznake tipa:
login.ts                    # ❌ Šta je ovo? Komponenta? Servis?
auth.ts                     # ❌ Nejasno
loader.ts                   # ❌ Ne zna se tip
app.ts                      # ❌ Nije jasno
```

**Izuzetak**: Samo `main.ts` i `index.ts` fajlovi NE zahtevaju oznaku tipa.

#### ✅ Struktura Komponente

Svaka komponenta **MORA** imati odvojene fajlove (bez inline template/styles):

```
login/
├── login.component.ts       # TypeScript logika
├── login.component.html     # Template
├── login.component.scss     # Stilovi
└── login.component.spec.ts  # Testovi (opciono)
```

#### ✅ Struktura Feature Modula

Feature folder sadrži **SVE** vezano za tu funkcionalnost:

```
appointments/
├── components/
│   ├── appointment-card/
│   │   ├── appointment-card.component.ts
│   │   ├── appointment-card.component.html
│   │   └── appointment-card.component.scss
│   └── appointment-form/
│       ├── appointment-form.component.ts
│       ├── appointment-form.component.html
│       └── appointment-form.component.scss
├── appointments.component.ts       # Glavna komponenta
├── appointments.component.html
├── appointments.component.scss
├── appointments.service.ts         # Servis specifičan za appointments
└── appointments.model.ts           # Modeli (Appointment, AppointmentStatus, etc.)
```

#### ❌ LOŠE - Inline Template/Styles

```typescript
// NE RADITI OVAKO
@Component({
  selector: 'app-login',
  template: `<div>...</div>`,
  styles: [`div { color: red; }`]
})
```

#### ❌ LOŠE - Servisi na Pogrešnom Mestu

```
// NE - specifični servisi ne idu u core/services/
core/services/appointments.service.ts  ❌

// DA - idu u feature folder
features/appointments/appointments.service.ts  ✅
```

#### ✅ core/ - Samo Zajednički Kod

````
core/
├── services/
│   ├── api.service.ts           # HTTPWrapper
│   ├── storage.service.ts       # LocalStorage/SessionStorage
│   ├── notification.service.ts  # Globalne notifikacije
│   └── theme.service.ts         # Tema/Dark mode
├── models/
│   ├── api-response.model.ts    # Zajednički API response tip
│   └── pagination.model.ts      # Pagination tip
├── interceptors/
├── guards/
└── utils/

### Angular Specifična Pravila

#### Organizacija Importa

**OBAVEZNO**: Uvek organizuj importove po sledećem redosledu sa praznim redovima između grupa:

```typescript
// ✅ DOBRO - Pravilna organizacija importa
// Grupa 1: @angular i rxjs importi
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { Observable, map, filter } from 'rxjs';

// Grupa 2: Alias importi (@core, @shared, @features, @environments)
import { AuthService } from '@core/services/auth.service';
import { HeaderComponent } from '@shared/components/header/header.component';
import { environment } from '@environments/environment';

// Grupa 3: Lokalni importi (../, ./)
import { AppointmentCardComponent } from '../appointment-card/appointment-card.component';
import { AppointmentService } from './appointment.service';
import { Appointment } from './appointment.model';

// ❌ LOŠE - Neuređeni importi
import { AppointmentService } from './appointment.service';
import { Component } from '@angular/core';
import { AuthService } from '@core/services/auth.service';
import { Observable } from 'rxjs';
import { HeaderComponent } from '@shared/components/header/header.component';
````

**Pravila**:

- Sortiraj alfabetski unutar svake grupe
- Jedan prazan red između grupa
- Alias importi (`@core`, `@shared`) imaju prednost nad lokalnim (`../`)
- Importi iz istog path-a grupiši u jedan statement: `import { A, B, C } from 'path'`

#### Komponente

```typescript
// ✅ DOBRO - Standalone komponenta sa signalima
@Component({
  selector: 'app-example',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isLoading()) {
      <p>Učitavanje...</p>
    }
    @for (item of items(); track item.id) {
      <div>{{ item.name }}</div>
    }
  `,
})
export class ExampleComponent {
  private service = inject(ExampleService);

  // Signal-based state
  isLoading = signal(false);
  items = signal<Item[]>([]);

  // Signal-based inputs (child komponente)
  // value = input<string>(); // ili input.required<string>()
}

// ❌ LOŠE - Stari pristup
@Component({
  // ...
  template: `
    <div *ngIf="isLoading">Učitavanje...</div>
    <div *ngFor="let item of items">{{ item.name }}</div>
  `,
})
export class OldComponent {
  constructor(private service: ExampleService) {}
  isLoading = false;
  items: Item[] = [];
}
```

#### Template Sintaksa

```html
<!-- ✅ DOBRO - Nova control flow sintaksa -->
@if (user(); as u) {
<p>Zdravo, {{ u.name }}</p>
} @else {
<p>Niste prijavljeni</p>
} @for (appointment of appointments(); track appointment.id) {
<app-appointment-card [appointment]="appointment" />
} @empty {
<p>Nema zakazanih termina</p>
} @switch (status()) { @case ('pending') {
<p>Na čekanju</p>
} @case ('confirmed') {
<p>Potvrđeno</p>
} @default {
<p>Nepoznato</p>
} }

<!-- ❌ LOŠE - Stari pristup -->
<div *ngIf="user">...</div>
<div *ngFor="let item of items">...</div>
```

#### Reactive Programming

```typescript
// ✅ DOBRO - Async pipe u template-u
export class ExampleComponent {
  appointments$ = this.service.getAppointments();
}
// Template: {{ appointments$ | async }}

// ✅ DOBRO - takeUntilDestroyed kada je subscribe neophodan
export class ExampleComponent {
  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    this.service.getData()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(data => this.processData(data));
  }
}

// ❌ LOŠE - Subscribe bez cleanup-a
ngOnInit() {
  this.service.getData().subscribe(data => ...);
}
```

#### Dependency Injection i Providers

```typescript
// ✅ DOBRO - inject() funkcija
export class ExampleComponent {
  private router = inject(Router);
  private fb = inject(FormBuilder);
}

// ✅ DOBRO - Funkcije umesto klasa za guards
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  return authService.isAuthenticated();
};

// ✅ DOBRO - Provider funkcije u app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
  ]
};

// ❌ LOŠE - Konstruktor DI
constructor(private router: Router) {}

// ❌ LOŠE - Klase za guards
@Injectable()
export class AuthGuard implements CanActivate { }
```

#### Forme

```typescript
// ✅ DOBRO - Reaktivne forme sa signalima
export class FormComponent {
  private fb = inject(FormBuilder);

  form = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
  });

  onSubmit() {
    if (this.form.valid) {
      console.log(this.form.value);
    }
  }
}

// ❌ LOŠE - Template-driven forme
<input [(ngModel)]="name">
```

#### Routing

```typescript
// ✅ DOBRO - Lazy loading
export const routes: Routes = [
  {
    path: 'appointments',
    loadComponent: () =>
      import('./features/appointments/appointments.component').then((m) => m.AppointmentsComponent),
    canActivate: [authGuard],
  },
];

// ❌ LOŠE - Eager loading svih komponenti
const routes = [{ path: 'appointments', component: AppointmentsComponent }];
```

### TypeScript Pravila

```typescript
// ✅ DOBRO - Strict typing
interface User {
  id: number;
  name: string;
  email: string;
}

const user: User = { ... };

// ✅ DOBRO - Type inference
const items = signal<Item[]>([]);

// ❌ LOŠE - any tip
const data: any = ...;
```

### Testiranje

```typescript
// ✅ DOBRO - Testiranje standalone komponenti
describe('ExampleComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExampleComponent],
    }).compileComponents();
  });

  it('should update signal', () => {
    const fixture = TestBed.createComponent(ExampleComponent);
    const component = fixture.componentInstance;

    component.mySignal.set('new value');
    expect(component.mySignal()).toBe('new value');
  });
});
```

### Komentari

- **NE STAVLJAJ** komentare osim ako nije eksplicitno naglašeno
- Kod treba da bude **self-explanatory**
- Koristi deskriptivna imena varijabli i funkcija

### Opšta Pravila

- ✅ Primenjuj **SOLID principe**
- ✅ **Immutability** - koristi readonly, const
- ✅ **Pure funkcije** gde god je moguće
- ✅ **Error handling** - catch i handle greške

---

## 🗄️ Razvoj Pristup

### Model-First Development

- **PRVO** dizajniramo bazu podataka i modele
- Kreiramo detaljnu DATABASE_SCHEMA.md dokumentaciju
- Usaglašavamo strukturu pre implementacije
- Tek onda pišemo kod (backend API, frontend komponente)
- **Pravilo**: Nikada ne menjamo strukturu baze u toku razvoja feature-a

### Soft Delete - OBAVEZNO

- ❌ **NIKAD ne brišemo podatke iz baze** (hard delete)
- ✅ Koristimo `is_active` kolonu (boolean)
- ✅ Sve query-je filtriramo sa `WHERE is_active = true`
- ✅ "Brisanje" = setovanje `is_active = false`
- ✅ Čuvamo istoriju i omogućavamo restore
- **Pravilo**: Hard delete samo ručno od strane admin-a direktno u bazi (za cleanup)

### Komunikacija sa Korisnicima

- **Primarno**: WhatsApp Business API
- **Sekundarno**: Email (za backup i formalne stvari)
- **Administrativne poruke**: WhatsApp nalog platforme
- **Business notifikacije**: WhatsApp broj biznisa (opciono)
- Svi korisnici moraju imati telefon broj za WhatsApp

### Workflow

1. ✅ Razmišljanje o problemu i strukturi
2. ✅ Kreiranje/Ažuriranje DATABASE_SCHEMA.md
3. ✅ Review i diskusija o šemi
4. ✅ Kreiranje SQL fajlova
5. ✅ Implementacija Sequelize modela
6. ✅ Kreiranje migracija
7. ✅ Backend API (controller, service, routes, validation)
8. ✅ Frontend (komponente, servisi, modeli)
9. ✅ Testiranje

---

## 🖥️ Node.js Backend Server (TypeScript)

### ⚠️ OBAVEZNO: Samo TypeScript

**Serverska aplikacija koristi isključivo TypeScript (.ts), NE JavaScript (.js)**

- ✅ **SVA** логика у `.ts` fajlovima
- ✅ TypeScript strict mode
- ✅ Eksplicitni tipovi za parametre i return values
- ✅ Interface/Type za sve modele i request/response tipove
- ❌ **ZABRANJEN** `.js` kod u `server/src/` direktorijumu
- ❌ **ZABRANJEN** `any` tip (izuzev ekstremnih slučajeva)
- ❌ **ZABRANJEN** `@ts-ignore` ili `@ts-nocheck`

### TypeScript Konfiguracija

**tsconfig.json pravila:**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true, // ✅ OBAVEZNO
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noUnusedLocals": true, // ✅ OBAVEZNO
    "noUnusedParameters": true, // ✅ OBAVEZNO
    "noImplicitReturns": true, // ✅ OBAVEZNO
    "noFallthroughCasesInSwitch": true, // ✅ OBAVEZNO
    "outDir": "./dist",
    "rootDir": "./src",
    "sourceMap": true
  }
}
```

### Osnovna Struktura

```
server/
├── src/
│   ├── modules/           # Feature moduli (TS)
│   │   ├── auth/
│   │   │   ├── auth.controller.ts      # ✅ Routes handler
│   │   │   ├── auth.service.ts         # ✅ Business logika
│   │   │   ├── auth.validation.ts      # ✅ Joi schemas
│   │   │   └── auth.types.ts           # ✅ TypeScript tipovi (opciono)
│   │   ├── appointments/
│   │   │   ├── appointments.controller.ts
│   │   │   ├── appointments.service.ts
│   │   │   └── appointments.validation.ts
│   │   └── ...
│   ├── core/              # Core funkcionalnosti (TS)
│   │   ├── database/
│   │   │   ├── connection.ts           # ✅ Sequelize/TypeORM konekcija
│   │   │   └── models/                 # ✅ Database modeli
│   │   │       ├── User.model.ts
│   │   │       ├── RefreshToken.model.ts
│   │   │       └── index.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts      # ✅ JWT auth
│   │   │   ├── validation.middleware.ts
│   │   │   ├── error.middleware.ts
│   │   │   └── not-found.middleware.ts
│   │   └── config/
│   ├── shared/            # Zajedničke utilities (TS)
│   │   ├── utils/
│   │   │   ├── jwt.util.ts             # ✅ JWT helper funkcije
│   │   │   ├── password.util.ts        # ✅ Bcrypt helpers
│   │   │   └── ...
│   │   └── types/
│   │       └── api.types.ts            # ✅ Zajednički TypeScript tipovi
│   └── app.ts             # ✅ Entry point (TS)
├── dist/                  # Compiled JS (auto-generated, git ignored)
├── .env.development       # Dev environment variables
├── .env.production        # Prod environment variables
├── tsconfig.json          # ✅ TypeScript konfiguracija
└── package.json
```

### TypeScript Pravila za Backend

#### Eksplicitni Tipovi - OBAVEZNO

```typescript
// ✅ DOBRO - Eksplicitni tipovi za parametre i return values
export const createAppointment = async (data: CreateAppointmentDto): Promise<Appointment> => {
  const appointment = await Appointment.create(data);
  return appointment;
};

// ✅ DOBRO - Tipizacija Express handler-a
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body as LoginRequest;
    const result = await authService.login(email, password);
    res.json(createSuccessResponse(result));
  } catch (error) {
    next(error);
  }
};

// ❌ LOŠE - Nedostaju tipovi
const createAppointment = async (data) => {
  return await Appointment.create(data);
};
```

#### Interface/Type Definitions

```typescript
// ✅ DOBRO - Jasne definicije tipova
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export enum UserRole {
  CLIENT = 'client',
  PROVIDER = 'provider',
  ADMIN = 'admin',
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    user: User;
  };
}

// ❌ LOŠE - Korišćenje any
const user: any = await User.findOne({ ... });
```

#### Error Handling sa Tipovima

```typescript
// ✅ DOBRO - Custom error klasa sa TypeScript
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true,
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// ✅ DOBRO - Type guard za error handling
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  res.status(statusCode).json({
    success: false,
    error: { message: err.message },
  });
};
```

#### Database Model Tipizacija (Sequelize)

```typescript
// ✅ DOBRO - Sequelize model sa TypeScript
import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../connection';

export interface UserAttributes {
  id: number;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface UserCreationAttributes extends Optional<UserAttributes, 'id'> {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: number;
  declare email: string;
  declare password: string;
  declare firstName: string;
  declare lastName: string;
  declare role: UserRole;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    // ...
  },
  {
    sequelize,
    tableName: 'users',
  },
);
```

#### Validation Schema sa Tipovima

```typescript
// ✅ DOBRO - Joi schema sa TypeScript interfejsom
import Joi from 'joi';

export interface LoginDto {
  email: string;
  password: string;
}

export const loginSchema = Joi.object<LoginDto>({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

// Middleware
export const validateRequest = <T>(schema: Joi.Schema<T>) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body);
    if (error) {
      throw new AppError(error.message, 400);
    }
    next();
  };
};
```

#### Service Layer Pattern

```typescript
// ✅ DOBRO - Service klasa sa tipovima
export class AuthService {
  async login(credentials: LoginRequest): Promise<AuthTokens> {
    const user = await User.findOne({ where: { email: credentials.email } });

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isValid = await comparePassword(credentials.password, user.password);

    if (!isValid) {
      throw new AppError('Invalid credentials', 401);
    }

    return this.generateTokens(user);
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken();

    await RefreshToken.create({
      token: refreshToken,
      userId: user.id,
      expiresAt: getRefreshTokenExpiry(),
    });

    return { accessToken, refreshToken };
  }
}

export default new AuthService();
```

### Backend Pravila

#### Konvencija Imenovanja Fajlova (Server)

**Pravilo**: Isti pristup kao Angular - eksplicitna oznaka tipa:

```
✅ DOBRO:
auth.controller.ts          # Express routes handler
auth.service.ts             # Business logika
auth.validation.ts          # Joi validation schemas
auth.middleware.ts          # Middleware funkcije
User.model.ts               # Database model (PascalCase)
RefreshToken.model.ts       # Database model
jwt.util.ts                 # Utility funkcije
api.types.ts                # TypeScript tipovi
app.config.ts               # Konfiguracija
connection.ts               # Database konekcija
app.ts                      # Entry point

❌ LOŠE:
auth.ts                     # Nejasno šta je
user.ts                     # Nedostaje oznaka tipa
controller.ts               # Suviše generalno
```

**Database modeli**: Koristi PascalCase sa `.model.ts` sufiksom (npr. `User.model.ts`, `Appointment.model.ts`)

#### Organizacija Importa (Server TypeScript)

```typescript
// ✅ DOBRO - Pravilna organizacija importa
// Grupa 1: Node.js core moduli
import { randomBytes } from 'crypto';
import path from 'path';

// Grupa 2: External packages (npm)
import express, { Request, Response, NextFunction } from 'express';
import { Sequelize, Model, DataTypes } from 'sequelize';
import Joi from 'joi';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Grupa 3: Core imports (database, middleware, config)
import sequelize from '../../core/database/connection';
import { authenticate } from '../../core/middleware/auth.middleware';
import { AppError } from '../../shared/types/api.types';

// Grupa 4: Lokalni imports
import { User } from './models/User.model';
import { AuthService } from './auth.service';
import { loginSchema } from './auth.validation';

// ❌ LOŠE - Neuređeni importi
import { User } from './models/User.model';
import express from 'express';
import sequelize from '../../core/database/connection';
import Joi from 'joi';
```

#### Unused Parameters

```typescript
// ✅ DOBRO - Prefix sa _ za nekorišćene parametre
app.get('/health', (_req, res) => {
  res.json({ status: 'OK' });
});

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    // res nije korišćen, ali je potreban za middleware signature
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('Unauthorized', 403));
    }
    next();
  };
};

// ❌ LOŠE - Nekorišćeni parametri bez prefix-a (TS greška)
app.get('/health', (req, res) => {
  // 'req' is declared but never read
  res.json({ status: 'OK' });
});
```

#### Null vs Undefined

```typescript
// ✅ DOBRO - Koristi undefined za optional polja u TypeScript
export interface UserAttributes {
  id: number;
  email: string;
  resetPasswordToken?: string; // undefined ako nije set
  resetPasswordExpires?: Date; // undefined ako nije set
}

// U servisu
user.resetPasswordToken = undefined; // ✅ Jasno označava absence vrednosti
user.resetPasswordExpires = undefined;

// ❌ LOŠE - Korišćenje null (može dovesti do type grešaka)
user.resetPasswordToken = null; // Type error ako je definisano kao string | undefined
```

#### Async/Await Pattern

```typescript
// ✅ DOBRO - Konzisentan async/await
export class AppointmentService {
  async findAll(): Promise<Appointment[]> {
    return await Appointment.findAll({ where: { isActive: true } });
  }

  async findById(id: number): Promise<Appointment | null> {
    const appointment = await Appointment.findByPk(id);

    if (!appointment || !appointment.isActive) {
      return null;
    }

    return appointment;
  }

  async create(data: CreateAppointmentDto): Promise<Appointment> {
    const appointment = await Appointment.create(data);
    return appointment;
  }
}

// ❌ LOŠE - Mešanje Promise.then() i async/await
async findAll() {
  return Appointment.findAll().then(results => results);  // Nedosledno
}
```

#### Environment Variables Tipizacija

```typescript
// ✅ DOBRO - Type-safe env variables
interface EnvironmentVariables {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  JWT_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_DAYS: number;
}

// config/env.config.ts
export const env: EnvironmentVariables = {
  NODE_ENV: (process.env.NODE_ENV as EnvironmentVariables['NODE_ENV']) || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '3306', 10),
  // ...
};
```

#### API Response Format

```typescript
// ✅ DOBRO - Konzistentan response format
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export const createSuccessResponse = <T>(data: T, meta?: any): ApiResponse<T> => ({
  success: true,
  data,
  ...(meta && { meta }),
});

export const createErrorResponse = (message: string, code?: string): ApiResponse => ({
  success: false,
  error: { message, code },
});

// Korišćenje
res.json(createSuccessResponse({ user, tokens }));
res.status(400).json(createErrorResponse('Validation failed'));
```

#### 📚 Swagger API Dokumentacija - OBAVEZNO

**Pravilo**: SVAKI novi ili izmenjeni API endpoint MORA imati ažurnu Swagger dokumentaciju

**Swagger UI lokacija**: `http://localhost:3000/api-docs`

##### Dokumentovanje Endpoint-a

```typescript
// ✅ DOBRO - Kompletan JSDoc komentar za Swagger
/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login korisnika
 *     description: Autentifikacija korisnika i vraćanje JWT tokena
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Uspešan login
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Nevalidni podaci
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Neispravni kredencijali
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', validateRequest(loginSchema), loginHandler);

// ❌ LOŠE - Nedostaje dokumentacija
router.post('/login', validateRequest(loginSchema), loginHandler);
```

##### Pravila za Swagger:

1. **Novi Endpoint**:
   - Dodati JSDoc komentar IZNAD route definicije
   - Definisati sve response statuse (200, 400, 401, 404, 500)
   - Koristiti `$ref` za schemas definisane u `swagger.config.ts`

2. **Izmena Endpoint-a**:
   - Ažurirati JSDoc komentar ako se menja:
     - Request body struktura
     - Response struktura
     - HTTP statusi
     - Endpoint path ili method

3. **Schema Changes**:
   - Ako menjaš TypeScript interface/type → ažuriraj odgovarajući schema u `swagger.config.ts`
   - Ako dodaješ novo polje → dodaj u Swagger schema sa `description` i `example`

4. **Protected Routes** (sa JWT autentifikacijom):

   ```typescript
   /**
    * @openapi
    * /api/appointments:
    *   get:
    *     tags:
    *       - Appointments
    *     summary: Preuzmi sve termine
    *     security:
    *       - BearerAuth: []
    *     responses:
    *       200:
    *         description: Lista termina
    *       401:
    *         description: Unauthorized
    */
   ```

5. **Lokacija Swagger Dokumenata**:
   - Schema definicije: `server/src/core/swagger.config.ts`
   - Endpoint dokumentacija: JSDoc u `.controller.ts` fajlovima
   - Swagger UI route definisan u `app.ts`

**Pre svakog commit-a**: Proveri da `http://localhost:3000/api-docs` prikazuje tačne podatke

#### Port i Konfiguracija

- **Port**: 3000
- **Environment**: Development i Production
- **CORS**:
  - Development: `*` (svi domeni)
  - Production: specifičan domain

#### Environment Fajlovi

```env
# .env.development
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=zakazivanje_dev
JWT_SECRET=super-secret-jwt-key-for-development-only-change-in-production-12345
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_DAYS=365
CORS_ORIGIN=http://localhost:4200
FRONTEND_URL=http://localhost:4200

# .env.production
NODE_ENV=production
PORT=3000
DB_HOST=production_host
DB_PORT=3306
DB_USER=prod_user
DB_PASSWORD=secure_password
DB_NAME=zakazivanje_prod
JWT_SECRET=very-secure-random-secret-key-min-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_DAYS=365
CORS_ORIGIN=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

#### Package.json Scripts

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/app.ts", // Development sa auto-restart
    "build": "tsc", // Compile TypeScript → JavaScript
    "start": "node dist/app.js", // Production start (posle build)
    "test": "jest", // Run testova
    "lint": "eslint . --ext .ts", // TypeScript linting
    "lint:fix": "eslint . --ext .ts --fix" // Auto-fix linting
  }
}
```

**Development workflow:**

1. `npm run dev` - Pokreće server u dev modu (ts-node direktno izvršava TS)
2. Svaka izmena automatski restartuje server (nodemon)
3. Source mape omogućavaju debugging u VS Code

**Production workflow:**

1. `npm run build` - Kompajlira TS → JS u `dist/` folder
2. `npm start` - Pokreće compiled JS kod
3. PM2 ili slični process manager za production

#### Controller Pattern sa TypeScript

```typescript
// ✅ DOBRO - Controller sa tipovima i async/await
import { Router, Request, Response, NextFunction } from 'express';
import { validateRequest } from '../../core/middleware/validation.middleware';
import { createSuccessResponse } from '../../shared/types/api.types';
import appointmentService from './appointments.service';
import { createAppointmentSchema } from './appointments.validation';

const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const appointments = await appointmentService.findAll();
    res.json(createSuccessResponse(appointments));
  } catch (error) {
    next(error);
  }
});

router.post(
  '/',
  validateRequest(createAppointmentSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appointment = await appointmentService.create(req.body);
      res.status(201).json(createSuccessResponse(appointment));
    } catch (error) {
      next(error);
    }
  },
);

export default router;
```

#### Service Pattern sa TypeScript

```typescript
// ✅ DOBRO - Service klasa sa jasnim tipovima
import { Appointment } from '../../core/database/models/Appointment.model';
import { AppError } from '../../shared/types/api.types';

export interface CreateAppointmentDto {
  userId: number;
  serviceId: number;
  dateTime: Date;
  notes?: string;
}

export class AppointmentService {
  async findAll(): Promise<Appointment[]> {
    return await Appointment.findAll({
      where: { isActive: true },
      order: [['dateTime', 'DESC']],
    });
  }

  async findById(id: number): Promise<Appointment> {
    const appointment = await Appointment.findByPk(id);

    if (!appointment || !appointment.isActive) {
      throw new AppError('Appointment not found', 404);
    }

    return appointment;
  }

  async create(data: CreateAppointmentDto): Promise<Appointment> {
    // Validacija business logike
    const existingAppointment = await this.checkConflict(data.serviceId, data.dateTime);

    if (existingAppointment) {
      throw new AppError('Time slot already taken', 409);
    }

    return await Appointment.create({
      ...data,
      status: 'pending',
      isActive: true,
    });
  }

  private async checkConflict(serviceId: number, dateTime: Date): Promise<Appointment | null> {
    // Check logic...
    return null;
  }
}

export default new AppointmentService();
```

#### Validation Schema Pattern

```typescript
// ✅ DOBRO - Joi validation sa TypeScript interfejsom
import Joi from 'joi';

export interface CreateAppointmentDto {
  userId: number;
  serviceId: number;
  dateTime: Date;
  notes?: string;
}

export const createAppointmentSchema = Joi.object<CreateAppointmentDto>({
  userId: Joi.number().integer().positive().required().messages({
    'number.base': 'User ID mora biti broj',
    'number.positive': 'User ID mora biti pozitivan broj',
    'any.required': 'User ID je obavezan',
  }),
  serviceId: Joi.number().integer().positive().required().messages({
    'number.base': 'Service ID mora biti broj',
    'any.required': 'Service ID je obavezan',
  }),
  dateTime: Joi.date().min('now').required().messages({
    'date.min': 'Datum mora biti u budućnosti',
    'any.required': 'Datum je obavezan',
  }),
  notes: Joi.string().max(500).optional().allow('').messages({
    'string.max': 'Napomena može imati maksimalno 500 karaktera',
  }),
});
```

#### MySQL i Baza

- **ORM**: Sequelize sa TypeScript
- **Migracije**: Za verzionisanje baze (opciono, koristimo SQL skripte)
- **Seed**: SQL skripte u `server/sql/` direktorijumu
- **Auto-sync**: U development modu (`sequelize.sync({ alter: true })`)
- **Manual migrations**: U production modu

#### Testing Pattern (TypeScript)

```typescript
// ✅ DOBRO - Test sa TypeScript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { AppointmentService } from './appointments.service';
import { Appointment } from '../../core/database/models/Appointment.model';

describe('AppointmentService', () => {
  let service: AppointmentService;

  beforeEach(() => {
    service = new AppointmentService();
  });

  it('should create appointment', async () => {
    const data = {
      userId: 1,
      serviceId: 1,
      dateTime: new Date('2026-04-10T10:00:00Z'),
    };

    const appointment = await service.create(data);

    expect(appointment).toBeDefined();
    expect(appointment.userId).toBe(data.userId);
    expect(appointment.status).toBe('pending');
  });

  it('should throw error for conflicting appointment', async () => {
    const data = {
      userId: 1,
      serviceId: 1,
      dateTime: new Date('2026-04-10T10:00:00Z'),
    };

    await service.create(data);

    await expect(service.create(data)).rejects.toThrow('Time slot already taken');
  });
});
```

---

## Git Workflow

### Branch Strategy

- `main` - production kod
- `develop` - development kod (opciono)
- `feature/naziv-feature-a` - novi feature-i
- `bugfix/naziv-bug-a` - ispravke

### Commit Messages

```
feat: dodaj appointment zakazivanje
fix: ispravi validaciju datuma
docs: ažuriraj README
refactor: reorganizuj servise
test: dodaj testove za auth
```

### Pre Commit

- ✅ Proveri linting
- ✅ Proveri testove
- ✅ Proveri TypeScript greške

---

## Verzionisanje Dokumenta

**Verzija**: 1.0
**Datum**: {{ trenutni_datum }}
**Autor**: Zakazivanje Tim

_Ovaj dokument će biti dopunjavan tokom razvoja projekta._
