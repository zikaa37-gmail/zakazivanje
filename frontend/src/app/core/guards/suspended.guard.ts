import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const notSuspendedGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isSuspended() ? inject(Router).createUrlTree(['/suspended']) : true;
};
