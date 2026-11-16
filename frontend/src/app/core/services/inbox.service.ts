import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { environment } from '../../../environments/environment';
import { SKIP_LOADER } from '../interceptors/loader.interceptor';
import { AuthService } from './auth.service';

export type InboxFilter = 'unread' | 'all';

export interface InboxItem {
  id: number;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  appointment_id?: number | null;
  read_at: string | null;
  created_at: string;
}

interface InboxPage {
  items: InboxItem[];
  has_more: boolean;
  unread_count: number;
}

const quiet = () => ({ context: new HttpContext().set(SKIP_LOADER, true) });

@Injectable({ providedIn: 'root' })
export class InboxService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private api = `${environment.apiUrl}/inbox`;

  readonly unreadCount = signal(0);
  readonly items = signal<InboxItem[]>([]);
  readonly filter = signal<InboxFilter>('unread');
  readonly hasMore = signal(false);
  readonly loading = signal(false);

  constructor() {
    effect(() => {
      const userId = this.auth.currentUser()?.id ?? null;
      untracked(() => {
        this.items.set([]);
        this.hasMore.set(false);
        this.unreadCount.set(0);
        if (userId) this.refreshCount();
      });
    });
  }

  refreshCount(): void {
    this.http.post<{ count: number }>(`${this.api}/unread-count`, {}, quiet()).subscribe({
      next: (res) => this.unreadCount.set(res.count),
      error: () => undefined,
    });
  }

  load(filter: InboxFilter = this.filter(), more = false): void {
    this.filter.set(filter);
    const beforeId = more ? this.items().at(-1)?.id : undefined;
    if (!more) this.items.set([]);
    this.loading.set(true);
    this.http.post<InboxPage>(`${this.api}/list`, { filter, before_id: beforeId ?? null }, quiet()).subscribe({
      next: (page) => {
        if (this.filter() !== filter) return;
        this.items.update((items) => (more ? [...items, ...page.items] : page.items));
        this.hasMore.set(page.has_more);
        this.unreadCount.set(page.unread_count);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  markRead(item: InboxItem): void {
    if (item.read_at) return;
    const readAt = new Date().toISOString();
    this.items.update((items) => items.map((i) => (i.id === item.id ? { ...i, read_at: readAt } : i)));
    this.unreadCount.update((count) => Math.max(0, count - 1));
    this.http.post<{ count: number }>(`${this.api}/${item.id}/read`, {}, quiet()).subscribe({
      next: (res) => this.unreadCount.set(res.count),
      error: () => undefined,
    });
  }

  markAllRead(): void {
    const readAt = new Date().toISOString();
    this.items.update((items) => (this.filter() === 'unread' ? [] : items.map((i) => ({ ...i, read_at: i.read_at ?? readAt }))));
    this.hasMore.update((more) => more && this.filter() !== 'unread');
    this.unreadCount.set(0);
    this.http.post(`${this.api}/read-all`, {}, quiet()).subscribe({ error: () => undefined });
  }

  received(item: Omit<InboxItem, 'read_at' | 'created_at'>): void {
    this.unreadCount.update((count) => count + 1);
    if (this.items().some((i) => i.id === item.id)) return;
    this.items.update((items) => [{ ...item, read_at: null, created_at: new Date().toISOString() }, ...items]);
  }
}
