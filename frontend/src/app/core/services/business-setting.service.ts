import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_LOADER } from '../interceptors/loader.interceptor';
import { BusinessSetting } from '../models/business-setting.model';
import { ThemeService } from './theme.service';

@Injectable({ providedIn: 'root' })
export class BusinessSettingService {
  private http = inject(HttpClient);
  private theme = inject(ThemeService);

  readonly settings = signal<BusinessSetting | null>(null);
  readonly coverSrc = computed(() => {
    const url = this.settings()?.cover_url;
    return url ? `${environment.apiUrl}${url}` : null;
  });
  readonly name = computed(() => this.settings()?.name ?? 'Zakazivanje');
  readonly logo = computed(() => this.settings()?.logo ?? null);

  load(): Observable<BusinessSetting> {
    return this.http
      .get<BusinessSetting>(`${environment.apiUrl}/public/business`, { context: new HttpContext().set(SKIP_LOADER, true) })
      .pipe(tap((settings) => this.store(settings)));
  }

  update(payload: Partial<BusinessSetting>): Observable<BusinessSetting> {
    return this.http
      .put<BusinessSetting>(`${environment.apiUrl}/business-settings`, payload)
      .pipe(tap((settings) => this.store(settings)));
  }

  private store(settings: BusinessSetting): void {
    this.settings.update((previous) => ({ ...settings, opening_hours: settings.opening_hours ?? previous?.opening_hours }));
    this.theme.applyBrand({
      primary: settings.theme_primary,
      secondary: settings.theme_secondary,
      tertiary: settings.theme_tertiary,
    });
  }
}
