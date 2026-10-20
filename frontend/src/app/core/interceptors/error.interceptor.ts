import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const isAuthEndpoint = req.url.includes('/auth/login') || req.url.includes('/auth/refresh');

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || isAuthEndpoint) {
        return throwError(() => err);
      }

      if (!auth.getRefreshToken()) {
        auth.clearSession();
        return throwError(() => err);
      }

      if (!auth.isRefreshing) {
        auth.isRefreshing = true;
        auth.refreshedAccessToken.next(null);

        return auth.refreshTokens().pipe(
          switchMap((res) => {
            auth.isRefreshing = false;
            auth.refreshedAccessToken.next(res.access_token);
            return next(req.clone({ setHeaders: { Authorization: `Bearer ${res.access_token}` } }));
          }),
          catchError((refreshErr) => {
            auth.isRefreshing = false;
            auth.clearSession();
            return throwError(() => refreshErr);
          }),
        );
      }

      return auth.refreshedAccessToken.pipe(
        filter((token): token is string => token !== null),
        take(1),
        switchMap((token) => next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }))),
      );
    }),
  );
};
