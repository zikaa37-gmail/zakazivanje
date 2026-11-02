import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AiStatus, StaffTerm } from '../models/business-setting.model';
import { CategoryProposal } from '../models/service.model';

@Injectable({ providedIn: 'root' })
export class AiService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/ai`;

  status(): Observable<AiStatus> {
    return this.http.get<AiStatus>(`${this.api}/status`);
  }

  saveKey(apiKey: string): Observable<AiStatus> {
    return this.http.put<AiStatus>(`${this.api}/key`, { api_key: apiKey });
  }

  forgetKey(): Observable<AiStatus> {
    return this.http.delete<AiStatus>(`${this.api}/key`);
  }

  serviceSuggestions(description: string | null): Observable<{ categories: CategoryProposal[] }> {
    return this.http.post<{ categories: CategoryProposal[] }>(`${this.api}/service-suggestions`, { description });
  }

  staffTerms(category: string, description: string | null): Observable<{ options: StaffTerm[] }> {
    return this.http.post<{ options: StaffTerm[] }>(`${this.api}/staff-term`, { category, description });
  }
}
