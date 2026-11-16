import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { InboxFilter, InboxItem, InboxService } from '../../core/services/inbox.service';
import { PushService } from '../../core/services/push.service';
import { DeviceNotificationsComponent } from '../../shared/components/device-notifications/device-notifications.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { SrDateTimePipe } from '../../shared/pipes/sr-date-time.pipe';
import { ButtonDirective } from '../../shared/directives/button.directive';
import { IconDirective } from '../../shared/directives/icon.directive';

interface DayGroup {
  label: string;
  items: InboxItem[];
}

const pad = (part: number) => String(part).padStart(2, '0');
const dayKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [ButtonDirective, IconDirective, DeviceNotificationsComponent, ModalComponent, SrDateTimePipe],
  templateUrl: './notifications-page.component.html',
  styleUrl: './notifications-page.component.scss',
})
export class NotificationsPageComponent {
  protected inbox = inject(InboxService);
  protected auth = inject(AuthService);
  private router = inject(Router);

  readonly filter = signal<InboxFilter>('all');
  readonly items = signal<InboxItem[]>([]);
  readonly hasMore = signal(false);
  readonly loading = signal(false);
  readonly showDevice = signal(false);
  readonly opened = signal<InboxItem | null>(null);
  protected push = inject(PushService);

  readonly tabs: { value: InboxFilter; label: string }[] = [
    { value: 'all', label: 'Sve' },
    { value: 'unread', label: 'Nepročitano' },
  ];

  readonly groups = computed<DayGroup[]>(() => {
    const now = new Date();
    const today = dayKey(now);
    const yesterday = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
    const groups: DayGroup[] = [];
    let currentKey = '';

    for (const item of this.items()) {
      const date = new Date(item.created_at);
      const key = dayKey(date);
      if (key !== currentKey) {
        currentKey = key;
        const label = key === today ? 'Danas' : key === yesterday ? 'Juče' : `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
        groups.push({ label, items: [] });
      }
      groups[groups.length - 1].items.push(item);
    }
    return groups;
  });

  constructor() {
    effect(() => {
      this.inbox.receivedCount();
      untracked(() => this.load(this.filter()));
    });
  }

  select(filter: InboxFilter): void {
    if (filter !== this.filter()) this.load(filter);
  }

  load(filter: InboxFilter, more = false): void {
    this.filter.set(filter);
    const beforeId = more ? (this.items().at(-1)?.id ?? null) : null;
    this.loading.set(true);
    this.inbox.page(filter, beforeId).subscribe({
      next: (page) => {
        if (this.filter() !== filter) return;
        this.items.update((items) => (more ? [...items, ...page.items] : page.items));
        this.hasMore.set(page.has_more);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  time(item: InboxItem): string {
    const date = new Date(item.created_at);
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  openItem(item: InboxItem, line: HTMLElement): void {
    this.markRead(item);
    if (line.scrollWidth > line.clientWidth + 1 || !item.link) {
      this.opened.set(item);
      return;
    }
    this.go(item);
  }

  go(item: InboxItem): void {
    this.opened.set(null);
    if (item.link) void this.router.navigateByUrl(item.link);
  }

  markRead(item: InboxItem): void {
    if (item.read_at) return;
    this.inbox.markRead(item);
    const readAt = new Date().toISOString();
    this.items.update((items) => items.map((i) => (i.id === item.id ? { ...i, read_at: readAt } : i)));
  }

  markAllRead(): void {
    this.inbox.markAllRead();
    const readAt = new Date().toISOString();
    if (this.filter() === 'unread') {
      this.items.set([]);
      this.hasMore.set(false);
    } else {
      this.items.update((items) => items.map((i) => ({ ...i, read_at: i.read_at ?? readAt })));
    }
  }
}
