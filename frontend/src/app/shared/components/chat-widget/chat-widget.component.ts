import { Component, DestroyRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BusinessSettingService } from '../../../core/services/business-setting.service';
import { ChatService, ChatSession } from '../../../core/services/chat.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { IconDirective } from '../../directives/icon.directive';
import { InputDirective } from '../../directives/input.directive';
import { SrDatePipe } from '../../pipes/sr-date.pipe';
import { ChatThreadComponent } from '../chat-thread/chat-thread.component';

type View = 'list' | 'topic' | 'new';

@Component({
  selector: 'app-chat-widget',
  imports: [ChatThreadComponent, IconDirective, InputDirective, ReactiveFormsModule, SrDatePipe],
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
  readonly view = signal<View>('list');
  readonly topicId = signal<number | null>(null);
  readonly subject = new FormControl('', { nonNullable: true });
  private thread = viewChild(ChatThreadComponent);

  readonly topic = computed(() => this.sessions().find((s) => s.id === this.topicId()) ?? null);
  readonly topicThread = computed(() => {
    const topic = this.topic();
    return topic ? [topic] : [];
  });
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
    this.view.set('list');
    this.topicId.set(null);
  }

  openTopic(session: ChatSession): void {
    this.topicId.set(session.id);
    this.view.set('topic');
    this.chat.viewingSessionId.set(session.id);
    setTimeout(() => this.thread()?.focus());
  }

  newTopic(): void {
    this.subject.reset('');
    this.topicId.set(null);
    this.view.set('new');
    this.chat.viewingSessionId.set(null);
    setTimeout(() => this.thread()?.focus());
  }

  backToList(): void {
    this.chat.widgetAppointment.set(null);
    this.topicId.set(null);
    this.view.set('list');
    this.chat.viewingSessionId.set(null);
  }

  load(silent = false): void {
    if (!silent) this.loading.set(true);
    this.chat.mine().subscribe({
      next: (res) => {
        this.sessions.set(res.sessions);
        this.loading.set(false);
        if (res.unread_count > 0) this.chat.readMine();
        else this.chat.unreadCount.set(0);
        if (!silent) this.pickView();
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, 'Poruke nisu učitane.'));
      },
    });
  }

  send(body: string): void {
    const appointment = this.chat.widgetAppointment();
    const target =
      this.view() === 'topic' ? { sessionId: this.topicId() } : { appointmentId: appointment?.id ?? null, subject: appointment ? null : this.subject.value.trim() || 'Pitanje' };
    this.sending.set(true);
    this.error.set(null);
    this.chat.sendMine(body, target).subscribe({
      next: (message) => {
        this.sending.set(false);
        this.chat.widgetAppointment.set(null);
        this.thread()?.clear();
        this.topicId.set(message.chat_session_id);
        this.view.set('topic');
        this.chat.viewingSessionId.set(message.chat_session_id);
        this.load(true);
      },
      error: (err) => {
        this.sending.set(false);
        this.error.set(apiErrorMessage(err, 'Poruka nije poslata.'));
      },
    });
  }

  private pickView(): void {
    const appointment = this.chat.widgetAppointment();
    if (appointment) {
      const existing = this.sessions().find((s) => s.active && s.appointment?.id === appointment.id);
      if (existing) this.openTopic(existing);
      else this.newTopic();
      return;
    }
    const current = this.topic();
    if (current) this.openTopic(current);
    else if (this.sessions().length === 0) this.newTopic();
    else this.view.set('list');
  }
}
