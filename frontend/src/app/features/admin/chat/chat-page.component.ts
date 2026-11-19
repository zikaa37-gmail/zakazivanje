import { InfoTipComponent } from '../../../shared/components/info-tip/info-tip.component';
import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, map } from 'rxjs';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ClientDirectoryService } from '../../../core/services/client-directory.service';
import { clientName } from '../../../core/utils/client-name';
import { SelectSearchComponent } from '../../../shared/components/select-search/select-search.component';
import { ChatService, ChatSession, ChatSessionDetail, ChatStatus } from '../../../core/services/chat.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { ChatThreadComponent } from '../../../shared/components/chat-thread/chat-thread.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { ButtonDirective } from '../../../shared/directives/button.directive';
import { IconDirective } from '../../../shared/directives/icon.directive';
import { InputDirective } from '../../../shared/directives/input.directive';
import { SrDatePipe } from '../../../shared/pipes/sr-date.pipe';
import { ClientNamePipe } from '../../../shared/pipes/client-name.pipe';

interface Draft {
  clientId: number;
  appointmentId: number | null;
  name: string;
}

@Component({
  selector: 'app-chat-page',
  imports: [InfoTipComponent, InputDirective, ReactiveFormsModule, ClientNamePipe, ButtonDirective, ChatThreadComponent, ErrorMessageComponent, IconDirective, SelectSearchComponent, SrDatePipe],
  templateUrl: './chat-page.component.html',
  styleUrl: './chat-page.component.scss',
})
export class ChatPageComponent {
  private chat = inject(ChatService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly status = signal<ChatStatus>('active');
  readonly sessions = signal<ChatSession[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly selectedId = signal<number | null>(null);
  readonly detail = signal<ChatSessionDetail | null>(null);
  readonly draft = signal<Draft | null>(null);
  readonly sending = signal(false);
  protected auth = inject(AuthService);
  protected directory = inject(ClientDirectoryService);
  readonly picking = signal(false);

  togglePicking(): void {
    if (!this.picking()) this.directory.ensure();
    this.picking.set(!this.picking());
  }
  readonly clientControl = new FormControl<number | null>(null);
  readonly clientOptions = computed(() => {
    const withAccount = new Set(this.directory.clients().filter((c) => c.has_account).map((c) => c.id));
    return this.directory.options().filter((o) => withAccount.has(o.value));
  });
  private thread = viewChild(ChatThreadComponent);

  readonly threadSessions = computed(() => {
    const detail = this.detail();
    return detail ? [detail] : [];
  });
  readonly draftSubject = new FormControl('', { nonNullable: true });
  readonly showConversation = computed(() => this.selectedId() !== null || this.draft() !== null);

  constructor() {
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => this.chat.viewingSessionId.set(null));

    this.clientControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((id) => {
      const client = this.directory.find(id);
      if (!client) return;
      this.picking.set(false);
      this.clientControl.setValue(null, { emitEvent: false });
      void this.router.navigate([], { queryParams: { client: client.id, name: clientName(client) } });
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const session = Number(params.get('session')) || null;
      const client = Number(params.get('client')) || null;
      if (session) {
        this.draft.set(null);
        this.open(session);
      } else if (client) {
        this.startDraft({ clientId: client, appointmentId: Number(params.get('appointment')) || null, name: params.get('name') ?? 'klijent' });
      } else {
        this.selectedId.set(null);
        this.detail.set(null);
        this.draft.set(null);
        this.chat.viewingSessionId.set(null);
      }
    });

    this.chat.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      this.loadList(true);
      if (event.session_id === this.selectedId()) this.open(event.session_id, true);
    });

    this.loadList();
  }

  setStatus(status: ChatStatus): void {
    this.status.set(status);
    this.loadList();
  }

  select(session: ChatSession): void {
    void this.router.navigate([], { queryParams: { session: session.id } });
  }

  back(): void {
    void this.router.navigate([], { queryParams: {} });
  }

  loadList(silent = false): void {
    if (!silent) this.loading.set(true);
    this.chat.list(this.status(), silent).subscribe({
      next: (res) => {
        this.sessions.set(res.sessions);
        this.chat.unreadCount.set(res.unread_count);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'Razgovori nisu učitani.'));
        this.loading.set(false);
      },
    });
  }

  private startDraft(draft: Draft): void {
    this.draftSubject.reset('');
    if (draft.appointmentId === null) {
      this.selectedId.set(null);
      this.detail.set(null);
      this.draft.set(draft);
      return;
    }
    this.chat.list('active', true).subscribe((res) => {
      const existing = res.sessions.find((s) => s.client_id === draft.clientId && s.appointment?.id === draft.appointmentId);
      if (existing) {
        void this.router.navigate([], { queryParams: { session: existing.id }, replaceUrl: true });
        return;
      }
      this.selectedId.set(null);
      this.detail.set(null);
      this.draft.set(draft);
    });
  }

  private open(id: number, silent = false): void {
    this.selectedId.set(id);
    this.chat.viewingSessionId.set(id);
    this.chat.show(id, silent).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.chat.unreadCount.set(detail.unread_count);
        this.sessions.update((list) => list.map((s) => (s.id === id ? { ...s, unread: 0 } : s)));
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Razgovor nije učitan.')),
    });
  }

  send(body: string): void {
    const draft = this.draft();
    const id = this.selectedId();
    this.sending.set(true);
    const request: Observable<number> = draft
      ? this.chat.start(draft.clientId, draft.appointmentId, body, this.draftSubject.value.trim() || null).pipe(map((res) => res.session_id))
      : this.chat.send(id!, body).pipe(map((message) => message.chat_session_id));
    request.subscribe({
      next: (sessionId) => {
        this.sending.set(false);
        this.thread()?.clear();
        if (draft) {
          this.status.set('active');
          void this.router.navigate([], { queryParams: { session: sessionId }, replaceUrl: true });
        } else {
          this.open(id!, true);
        }
        this.loadList(true);
      },
      error: (err) => {
        this.sending.set(false);
        this.toast.error(apiErrorMessage(err, 'Poruka nije poslata.'));
      },
    });
  }

  goTo(id: number): void {
    void this.router.navigate([], { queryParams: { session: id } });
  }

  async closeSession(): Promise<void> {
    const detail = this.detail();
    if (!detail) return;
    const ok = await this.confirm.confirm({
      title: 'Završi temu',
      message: `Tema „${detail.subject}" se zatvara. Ako neko ponovo piše u njoj, tema se otvara; klijent za novo pitanje otvara novu temu.`,
      confirmLabel: 'Završi',
    });
    if (!ok) return;
    this.chat.close(detail.id).subscribe({
      next: () => {
        this.toast.success('Tema je završena.');
        this.open(detail.id, true);
        this.loadList(true);
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Razgovor nije zatvoren.')),
    });
  }

  time(value: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    const pad = (n: number) => String(n).padStart(2, '0');
    const sameDay = date.toDateString() === new Date().toDateString();
    return sameDay ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.`;
  }
}
