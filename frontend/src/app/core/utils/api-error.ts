import { HttpErrorResponse } from '@angular/common/http';

export function apiErrorMessage(error: unknown, fallback = 'Došlo je do greške. Pokušaj ponovo.'): string {
  if (!(error instanceof HttpErrorResponse)) return fallback;
  if (error.status === 0) return 'Server nije dostupan. Proveri internet vezu.';
  if (error.status === 429) return 'Previše pokušaja. Sačekaj minut pa probaj ponovo.';

  const errors = error.error?.errors as Record<string, string[]> | undefined;
  const firstFieldError = errors ? Object.values(errors)[0]?.[0] : undefined;

  return firstFieldError ?? error.error?.message ?? fallback;
}
