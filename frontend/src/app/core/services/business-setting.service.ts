import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BusinessSetting } from '../models/business-setting.model';

@Injectable({ providedIn: 'root' })
export class BusinessSettingService {
  private http = inject(HttpClient);

  readonly settings = signal<BusinessSetting | null>(null);

  load(): Observable<BusinessSetting> {
    return this.http
      .get<BusinessSetting>(`${environment.apiUrl}/public/business`)
      .pipe(tap((settings) => this.settings.set(settings)));
  }

  update(payload: Partial<BusinessSetting>): Observable<BusinessSetting> {
    return this.http
      .put<BusinessSetting>(`${environment.apiUrl}/business-settings`, payload)
      .pipe(tap((settings) => this.settings.set(settings)));
  }
}
