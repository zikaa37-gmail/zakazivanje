import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_LOADER } from '../interceptors/loader.interceptor';
import { AuthService } from './auth.service';
import { BusinessSettingService } from './business-setting.service';
import { ToastService } from './toast.service';

export interface ChatMessage {
  id: number;
  chat_session_id: number;
  body: string;
  created_at: string;
  author_id: number | null;
  author_name: string | null;
  from_client: boolean;
}

export interface ChatAppointmentRef {
  id: number;
  starts_at: string;
  services: string;
  staff: string | null;
}

export interface ChatSession {
  id: number;
  client_id: number;
  client_name: string | null;
  active: boolean;
  expires_at: string;
  closed_at: string | null;
  last_message_at: string | null;
  created_at: string;
  assignee: string | null;
  appointment: ChatAppointmentRef | null;
  messages?: ChatMessage[];
  unread?: number;
  last_message?: string | null;
  last_from_client?: boolean;
}

export interface ChatSessionDetail extends ChatSession {
  client: { id: number; first_name: string; last_name: string; nickname?: string | null; phone: string | null; email: string | null } | null;
  earlier: ChatSession[];
  unread_count: number;
}

export interface ChatEvent {
  session_id: number;
  message?: ChatMessage;
  closed?: boolean;
}

export type ChatStatus = 'active' | 'closed';

const quiet = () => ({ context: new HttpContext().set(SKIP_LOADER, true) });

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private business = inject(BusinessSettingService);
  private toast = inject(ToastService);
  private api = `${environment.apiUrl}/chat`;

  readonly unreadCount = signal(0);
  readonly events = new Subject<ChatEvent>();
  readonly viewingSessionId = signal<number | null>(null);
  readonly widgetOpen = signal(false);
  readonly widgetAppointment = signal<ChatAppointmentRef | null>(null);

  constructor() {
    effect(() => {
      const userId = this.auth.currentUser()?.id ?? null;
      untracked(() => {
        this.unreadCount.set(0);
        this.widgetOpen.set(false);
        if (userId) this.refreshCount();
      });
    });
  }

  enabled(): boolean {
    return this.business.settings()?.chat_enabled ?? true;
  }

  refreshCount(): void {
    this.http.post<{ count: number }>(`${this.api}/unread-count`, {}, quiet()).subscribe({
      next: (res) => this.unreadCount.set(res.count),
      error: () => undefined,
    });
  }

  received(event: ChatEvent): void {
    this.events.next(event);
    const message = event.message;
    if (!message || message.author_id === this.auth.currentUser()?.id) return;
    const viewing = this.viewingSessionId() === event.session_id && (this.auth.isStaff() || this.widgetOpen());
    if (viewing) return;
    const fromClientToStaff = this.auth.isStaff() && message.from_client;
    const fromSalonToClient = !this.auth.isStaff() && !message.from_client;
    if (!fromClientToStaff && !fromSalonToClient) return;
    this.unreadCount.update((count) => count + 1);
    const who = this.auth.isStaff() ? (message.author_name ?? 'Klijent') : (this.business.settings()?.name ?? 'Salon');
    this.toast.show(`${who}: ${message.body}`, { type: 'info', position: 'top-right', duration: 8000 });
  }

  openWidget(appointment: ChatAppointmentRef | null = null): void {
    this.widgetAppointment.set(appointment);
    this.widgetOpen.set(true);
  }

  mine(): Observable<{ sessions: ChatSession[]; unread_count: number }> {
    return this.http.post<{ sessions: ChatSession[]; unread_count: number }>(`${this.api}/my`, {}, quiet());
  }

  sendMine(body: string, appointmentId: number | null): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${this.api}/my/messages`, { body, appointment_id: appointmentId }, quiet());
  }

  readMine(): void {
    this.unreadCount.set(0);
    this.http.post(`${this.api}/my/read`, {}, quiet()).subscribe({ error: () => undefined });
  }

  list(status: ChatStatus, silent = false): Observable<{ sessions: ChatSession[]; unread_count: number }> {
    return this.http.post<{ sessions: ChatSession[]; unread_count: number }>(`${this.api}/sessions/list`, { status }, silent ? quiet() : {});
  }

  show(id: number, silent = false): Observable<ChatSessionDetail> {
    return this.http.get<ChatSessionDetail>(`${this.api}/sessions/${id}`, silent ? quiet() : {});
  }

  send(id: number, body: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${this.api}/sessions/${id}/messages`, { body }, quiet());
  }

  read(id: number): void {
    this.http.post<{ count: number }>(`${this.api}/sessions/${id}/read`, {}, quiet()).subscribe({
      next: (res) => this.unreadCount.set(res.count),
      error: () => undefined,
    });
  }

  close(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/sessions/${id}/close`, {});
  }

  start(clientId: number, appointmentId: number | null, body: string): Observable<{ session_id: number; message: ChatMessage }> {
    return this.http.post<{ session_id: number; message: ChatMessage }>(`${this.api}/start`, { client_id: clientId, appointment_id: appointmentId, body });
  }
}
