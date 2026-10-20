import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { AuthService } from './core/services/auth.service';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: () => inject(AuthService).homeUrl(),
  },
  {
    path: 'login',
    title: 'Prijava',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'profile',
    title: 'Profil',
    canActivate: [authGuard],
    loadComponent: () => import('./features/client/profile.component').then((m) => m.ProfileComponent),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./layout/admin-shell.component').then((m) => m.AdminShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'staff' },
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
