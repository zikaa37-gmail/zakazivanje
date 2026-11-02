import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const clientAreaGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isStaff() ? inject(Router).createUrlTree(['/admin']) : true;
};
