import { Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { InboxFilter, InboxItem, InboxService } from '../../../core/services/inbox.service';
import { IconDirective } from '../../directives/icon.directive';
import { SrDateTimePipe } from '../../pipes/sr-date-time.pipe';

@Component({
  selector: 'app-inbox-bell',
  standalone: true,
  imports: [IconDirective, SrDateTimePipe],
  templateUrl: './inbox-bell.component.html',
  styleUrl: './inbox-bell.component.scss',
  host: {
    '(document:keydown.escape)': 'close()',
  },
})
export class InboxBellComponent {
  protected inbox = inject(InboxService);
  private router = inject(Router);

  readonly placement = input<'header' | 'sidebar'>('header');
  readonly open = signal(false);
  readonly countLabel = computed(() => (this.inbox.unreadCount() > 99 ? '99+' : String(this.inbox.unreadCount())));

  readonly tabs: { value: InboxFilter; label: string }[] = [
    { value: 'unread', label: 'Nepročitano' },
    { value: 'all', label: 'Sve' },
  ];

  toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }
    this.open.set(true);
    this.inbox.load(this.inbox.unreadCount() > 0 ? 'unread' : 'all');
  }

  close(): void {
    this.open.set(false);
  }

  select(filter: InboxFilter): void {
    if (filter !== this.inbox.filter()) this.inbox.load(filter);
  }

  openItem(item: InboxItem): void {
    this.inbox.markRead(item);
    if (!item.link) return;
    this.close();
    void this.router.navigateByUrl(item.link);
  }
}
