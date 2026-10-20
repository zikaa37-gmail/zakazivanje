import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, shareReplay } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SKIP_LOADER } from '../../core/interceptors/loader.interceptor';

@Injectable({ providedIn: 'root' })
export class IconService {
  private http = inject(HttpClient);
  private cache = new Map<string, Observable<string>>();

  load(name: string): Observable<string> {
    let request = this.cache.get(name);
    if (!request) {
      request = this.http
        .get(`/icons/${name}.svg`, { responseType: 'text', context: new HttpContext().set(SKIP_LOADER, true) })
        .pipe(
          catchError(() => of('')),
          shareReplay(1),
        );
      this.cache.set(name, request);
    }
    return request;
  }
}
