import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Prijava',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    title: 'Registracija',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'forgot-password',
    title: 'Zaboravljena lozinka',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/forgot-password.component').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    title: 'Nova lozinka',
    loadComponent: () => import('./features/auth/reset-password.component').then((m) => m.ResetPasswordComponent),
  },
  {
    path: 'verify-email',
    title: 'Potvrda emaila',
    loadComponent: () => import('./features/auth/verify-email.component').then((m) => m.VerifyEmailComponent),
  },
  {
    path: '',
    loadComponent: () => import('./layout/public-shell.component').then((m) => m.PublicShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./features/public/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'book',
        title: 'Zakazivanje',
        loadComponent: () => import('./features/public/book.component').then((m) => m.BookComponent),
      },
      {
        path: 'gallery',
        title: 'Galerija',
        loadComponent: () => import('./features/public/gallery.component').then((m) => m.GalleryComponent),
      },
      {
        path: 'reviews',
        title: 'Utisci klijenata',
        loadComponent: () => import('./features/public/reviews.component').then((m) => m.ReviewsComponent),
      },
      {
        path: 'my-appointments',
        title: 'Moji termini',
        canActivate: [authGuard],
        loadComponent: () => import('./features/client/my-appointments.component').then((m) => m.MyAppointmentsComponent),
      },
      {
        path: 'profile',
        title: 'Profil',
        canActivate: [authGuard],
        loadComponent: () => import('./features/client/profile.component').then((m) => m.ProfileComponent),
      },
    ],
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./layout/admin-shell.component').then((m) => m.AdminShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Pregled',
        loadComponent: () => import('./features/admin/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'appointments',
        title: 'Termini',
        loadComponent: () => import('./features/admin/appointments/appointment-list.component').then((m) => m.AppointmentListComponent),
      },
      {
        path: 'calendar',
        title: 'Kalendar',
        loadComponent: () => import('./features/admin/calendar/calendar.component').then((m) => m.CalendarComponent),
      },
      {
        path: 'staff',
        title: 'Zaposleni',
        loadComponent: () => import('./features/admin/staff/staff-list.component').then((m) => m.StaffListComponent),
      },
      {
        path: 'services',
        title: 'Usluge',
        loadComponent: () => import('./features/admin/services/service-list.component').then((m) => m.ServiceListComponent),
      },
      {
        path: 'promotions',
        title: 'Cene i akcije',
        loadComponent: () => import('./features/admin/promotions/promotion-list.component').then((m) => m.PromotionListComponent),
      },
      {
        path: 'gallery',
        title: 'Galerija',
        loadComponent: () => import('./features/admin/gallery/gallery-admin.component').then((m) => m.GalleryAdminComponent),
      },
      {
        path: 'reviews',
        title: 'Recenzije',
        loadComponent: () => import('./features/admin/reviews/review-list.component').then((m) => m.ReviewListComponent),
      },
      {
        path: 'share',
        title: 'Podeli',
        loadComponent: () => import('./features/admin/share/share.component').then((m) => m.ShareComponent),
      },
      {
        path: 'clients',
        title: 'Klijenti',
        loadComponent: () => import('./features/admin/clients/client-list.component').then((m) => m.ClientListComponent),
      },
      {
        path: 'settings',
        title: 'Podešavanja',
        loadComponent: () => import('./features/admin/settings/settings.component').then((m) => m.SettingsComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
