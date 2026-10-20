import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoaderService } from '../services/loader.service';

export const SKIP_LOADER = new HttpContextToken<boolean>(() => false);

export const loaderInterceptor: HttpInterceptorFn = (req, next) => {
  const loader = inject(LoaderService);

  if (req.context.get(SKIP_LOADER)) {
    return next(req);
  }

  loader.start();
  return next(req).pipe(finalize(() => loader.stop()));
};
