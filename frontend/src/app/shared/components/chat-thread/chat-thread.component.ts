import { Component, ElementRef, afterRenderEffect, computed, input, output, signal, viewChild } from '@angular/core';
import { ChatMessage, ChatSession } from '../../../core/services/chat.service';
import { IconDirective } from '../../directives/icon.directive';
import { SrDatePipe } from '../../pipes/sr-date.pipe';

@Component({
  selector: 'app-chat-thread',
  standalone: true,
  imports: [IconDirective, SrDatePipe],
  templateUrl: './chat-thread.component.html',
  styleUrl: './chat-thread.component.scss',
})
export class ChatThreadComponent {
  readonly sessions = input<ChatSession[]>([]);
  readonly perspective = input<'client' | 'staff'>('client');
  readonly sending = input(false);
  readonly placeholder = input('Napiši poruku...');
  readonly emptyText = input('');
  readonly send = output<string>();

  readonly draft = signal('');
  private scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private input = viewChild<ElementRef<HTMLTextAreaElement>>('input');

  readonly blocks = computed(() =>
    this.sessions()
      .filter((s) => (s.messages ?? []).length > 0)
      .map((s) => ({ session: s, messages: [...(s.messages ?? [])].sort((a, b) => a.id - b.id) })),
  );

  readonly messageCount = computed(() => this.blocks().reduce((sum, b) => sum + b.messages.length, 0));

  constructor() {
    afterRenderEffect(() => {
      this.messageCount();
      const el = this.scroller()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  own(message: ChatMessage): boolean {
    return this.perspective() === 'client' ? message.from_client : !message.from_client;
  }

  time(message: ChatMessage): string {
    const date = new Date(message.created_at);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  onKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submit();
    }
  }

  submit(): void {
    const body = this.draft().trim();
    if (!body || this.sending()) return;
    this.send.emit(body);
  }

  clear(): void {
    this.draft.set('');
    this.input()?.nativeElement.focus();
  }

  focus(): void {
    this.input()?.nativeElement.focus();
  }
}
