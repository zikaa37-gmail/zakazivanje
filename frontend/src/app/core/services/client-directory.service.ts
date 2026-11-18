import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { SKIP_LOADER } from '../interceptors/loader.interceptor';
import { Client } from '../models/client.model';
import { clientName } from '../utils/client-name';
import { SelectSearchOption } from '../../shared/components/select-search/select-search.component';

const STALE_AFTER_MS = 5 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class ClientDirectoryService {
  private http = inject(HttpClient);
  private loadedAt = 0;

  readonly clients = signal<Client[]>([]);
  readonly loading = signal(false);
  readonly options = computed<SelectSearchOption<number>[]>(() =>
    this.clients().map((c) => ({ value: c.id, label: clientName(c), hint: [c.phone, c.email].filter(Boolean).join(' · '), search: `${c.first_name} ${c.last_name} ${c.nickname ?? ''}` })),
  );

  ensure(): void {
    if (this.loading() || Date.now() - this.loadedAt < STALE_AFTER_MS) return;
    this.loading.set(true);
    this.http.post<Client[]>(`${environment.apiUrl}/clients/directory`, {}, { context: new HttpContext().set(SKIP_LOADER, true) }).subscribe({
      next: (list) => {
        this.clients.set(list);
        this.loadedAt = Date.now();
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  invalidate(): void {
    this.loadedAt = 0;
  }

  find(id: number | null): Client | null {
    return this.clients().find((c) => c.id === id) ?? null;
  }
}
