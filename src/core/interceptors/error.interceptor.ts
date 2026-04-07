import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'Došlo je do greške. Pokušajte ponovo.';

      if (error.error instanceof ErrorEvent) {
        errorMessage = `Greška: ${error.error.message}`;
      } else {
        if (error.status === 401) {
          errorMessage = 'Niste autorizovani. Prijavite se ponovo.';
        } else if (error.status === 403) {
          errorMessage = 'Nemate dozvolu za ovu akciju.';
        } else if (error.status === 404) {
          errorMessage = 'Resurs nije pronađen.';
        } else if (error.status === 500) {
          errorMessage = 'Greška na serveru. Pokušajte kasnije.';
        } else if (error.error?.error?.message) {
          errorMessage = error.error.error.message;
        }
      }

      console.error('HTTP Error:', errorMessage);
      return throwError(() => new Error(errorMessage));
    }),
  );
};
