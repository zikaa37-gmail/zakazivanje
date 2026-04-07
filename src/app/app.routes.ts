import { Routes } from '@angular/router';

import { authGuard } from '../core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('../features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('../auth/login/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('../auth/register/register.component').then((m) => m.RegisterComponent),
      },
      {
        path: 'register-business',
        loadComponent: () =>
          import('../auth/register-business/register-business.component').then(
            (m) => m.RegisterBusinessComponent,
          ),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('../auth/forgot-password/forgot-password.component').then(
            (m) => m.ForgotPasswordComponent,
          ),
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('../auth/reset-password/reset-password.component').then(
            (m) => m.ResetPasswordComponent,
          ),
      },
      {
        path: 'verify-email',
        loadComponent: () =>
          import('../auth/verify-email/verify-email.component').then(
            (m) => m.VerifyEmailComponent,
          ),
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'search',
    loadComponent: () =>
      import('../features/search/search.component').then((m) => m.SearchComponent),
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('../features/profile/profile.component').then((m) => m.ProfileComponent),
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];

