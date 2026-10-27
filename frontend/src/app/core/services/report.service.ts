import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Report, ReportChannel, ReportQuery } from '../models/report.model';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/reports`;

  get(query: ReportQuery): Observable<Report> {
    return this.http.post<Report>(this.api, query);
  }

  send(query: ReportQuery, channel: ReportChannel): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/send`, { ...query, channel });
  }

  async openPdf(query: ReportQuery, fileName: string): Promise<void> {
    const tab = window.open('', '_blank');
    const blob = await firstValueFrom(this.http.post(`${this.api}/pdf`, query, { responseType: 'blob' })).catch((err) => {
      tab?.close();
      throw err;
    });
    const url = URL.createObjectURL(blob);
    if (tab) {
      tab.location.href = url;
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}
