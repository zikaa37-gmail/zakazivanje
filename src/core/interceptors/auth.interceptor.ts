import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from '../../auth/auth.service';

const inProgress = signal(false);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const publicEndpoints = [
    '/auth/login',
    '/auth/register',
    '/auth/register/business',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
  ];

  const isPublicEndpoint = publicEndpoints.some((endpoint) => req.url.includes(endpoint));
  const isRefreshEndpoint = req.url.includes('/auth/refresh-token');

  if (!isPublicEndpoint && !isRefreshEndpoint) {
    const token = authService.getToken();

    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isPublicEndpoint && !isRefreshEndpoint && !inProgress()) {
        inProgress.set(true);

        return authService.refreshAccessToken().pipe(
          switchMap(() => {
            inProgress.set(false);

            const newToken = authService.getToken();
            if (newToken) {
              const clonedReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`,
                },
              });
              return next(clonedReq);
            }

            authService.logout();
            router.navigate(['/auth/login']);
            return throwError(() => error);
          }),
          catchError((refreshError) => {
            inProgress.set(false);
            authService.logout();
            router.navigate(['/auth/login']);
            return throwError(() => refreshError);
          }),
        );
      }

      return throwError(() => error);
    }),
  );
};
