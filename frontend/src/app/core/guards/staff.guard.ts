import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const staffGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isStaff()) {
    return true;
  }

  return auth.isAuthenticated()
    ? router.createUrlTree([auth.homeUrl()])
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const ownerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isOwner() ? true : inject(Router).createUrlTree(['/admin/dashboard']);
};
