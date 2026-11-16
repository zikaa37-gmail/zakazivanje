import { Component, DestroyRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { BusinessSettingService } from '../../../core/services/business-setting.service';
import { ChatService, ChatSession } from '../../../core/services/chat.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { IconDirective } from '../../directives/icon.directive';
import { SrDatePipe } from '../../pipes/sr-date.pipe';
import { ChatThreadComponent } from '../chat-thread/chat-thread.component';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [ChatThreadComponent, IconDirective, SrDatePipe],
  templateUrl: './chat-widget.component.html',
  styleUrl: './chat-widget.component.scss',
  host: {
    '(document:keydown.escape)': 'close()',
  },
})
export class ChatWidgetComponent {
  protected chat = inject(ChatService);
  protected business = inject(BusinessSettingService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly sessions = signal<ChatSession[]>([]);
  readonly loading = signal(false);
  readonly sending = signal(false);
  readonly error = signal<string | null>(null);
  private thread = viewChild(ChatThreadComponent);

  readonly ordered = computed(() => [...this.sessions()].reverse());
  readonly active = computed(() => this.sessions().find((s) => s.active) ?? null);
  readonly countLabel = computed(() => (this.chat.unreadCount() > 9 ? '9+' : String(this.chat.unreadCount())));

  constructor() {
    effect(() => {
      if (this.chat.widgetOpen()) untracked(() => this.load());
    });

    this.chat.events.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(() => {
      if (this.chat.widgetOpen()) this.load(true);
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      if (params.get('chat') !== '1') return;
      this.chat.openWidget();
      void this.router.navigate([], { queryParams: { chat: null }, queryParamsHandling: 'merge', replaceUrl: true });
    });
  }

  toggle(): void {
    if (this.chat.widgetOpen()) this.close();
    else this.chat.openWidget();
  }

  close(): void {
    this.chat.widgetOpen.set(false);
    this.chat.widgetAppointment.set(null);
    this.chat.viewingSessionId.set(null);
  }

  load(silent = false): void {
    if (!silent) this.loading.set(true);
    this.chat.mine().subscribe({
      next: (res) => {
        this.sessions.set(res.sessions);
        this.loading.set(false);
        this.chat.viewingSessionId.set(this.active()?.id ?? null);
        if (res.unread_count > 0) this.chat.readMine();
        else this.chat.unreadCount.set(0);
        setTimeout(() => this.thread()?.focus());
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, 'Poruke nisu učitane.'));
      },
    });
  }

  send(body: string): void {
    this.sending.set(true);
    this.error.set(null);
    this.chat.sendMine(body, this.chat.widgetAppointment()?.id ?? null).subscribe({
      next: () => {
        this.sending.set(false);
        this.chat.widgetAppointment.set(null);
        this.thread()?.clear();
        this.load(true);
      },
      error: (err) => {
        this.sending.set(false);
        this.error.set(apiErrorMessage(err, 'Poruka nije poslata.'));
      },
    });
  }
}
