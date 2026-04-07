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

## Node.js Backend

### Osnovna Struktura

```
server/
├── src/
│   ├── features/           # Feature moduli
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.model.ts
│   │   │   └── auth.validation.ts
│   │   ├── appointments/
│   │   └── ...
│   ├── core/              # Core funkcionalnosti
│   │   ├── database/
│   │   ├── middleware/
│   │   └── config/
│   ├── shared/            # Zajedničke utilities
│   │   ├── utils/
│   │   ├── types/
│   │   └── constants/
│   └── app.ts            # Entry point
├── .env.development
├── .env.production
└── package.json
```

### Backend Pravila

#### Port i Konfiguracija

- **Port**: 3000
- **Environment**: Development i Production
- **CORS**:
  - Development: `*` (svi domeni)
  - Production: specifičan domain

#### Environment Fajlovi

```env
# .env.development
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=zakazivanje_dev
CORS_ORIGIN=*

# .env.production
PORT=3000
DB_HOST=production_host
DB_USER=prod_user
DB_PASSWORD=prod_password
DB_NAME=zakazivanje_prod
CORS_ORIGIN=https://yourdomain.com
```

#### Organizacija po Feature-ima

```typescript
// features/appointments/appointments.controller.ts
export class AppointmentsController {
  async getAll(req, res) { ... }
  async getById(req, res) { ... }
  async create(req, res) { ... }
  async update(req, res) { ... }
  async delete(req, res) { ... }
}

// features/appointments/appointments.service.ts
export class AppointmentsService {
  async findAll() { ... }
  async findById(id) { ... }
  async create(data) { ... }
}

// features/appointments/appointments.model.ts
export interface Appointment {
  id: number;
  userId: number;
  serviceId: number;
  date: Date;
  status: string;
}

// features/appointments/appointments.validation.ts
export const createAppointmentSchema = {
  userId: Joi.number().required(),
  serviceId: Joi.number().required(),
  date: Joi.date().required()
};
```

#### MySQL i Baza

- **ORM**: Možemo koristiti Sequelize ili TypeORM
- **Migracije**: Za verzionisanje baze
- **Seed**: Za test podatke

---

## Git Workflow

### Branch Strategy

- `main` - production kod
- `develop` - development kod
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
