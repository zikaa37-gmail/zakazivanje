import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { InboxService } from '../../../core/services/inbox.service';
import { NoteRecipient, StaffNote, StaffNoteService } from '../../../core/services/staff-note.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { InfoTipComponent } from '../../../shared/components/info-tip/info-tip.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ButtonDirective } from '../../../shared/directives/button.directive';
import { IconDirective } from '../../../shared/directives/icon.directive';
import { InputDirective } from '../../../shared/directives/input.directive';
import { SrDateTimePipe } from '../../../shared/pipes/sr-date-time.pipe';

@Component({
  selector: 'app-notes',
  imports: [InfoTipComponent, ReactiveFormsModule, ButtonComponent, ButtonDirective, ErrorMessageComponent, IconDirective, InputDirective, ModalComponent, SrDateTimePipe],
  templateUrl: './notes.component.html',
  styleUrl: './notes.component.scss',
})
export class NotesComponent {
  private notesService = inject(StaffNoteService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private inbox = inject(InboxService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly title = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] });
  readonly body = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] });
  readonly notes = signal<StaffNote[]>([]);
  readonly recipients = signal<NoteRecipient[]>([]);
  readonly selected = signal<Set<number>>(new Set());
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly composing = signal(false);
  readonly replyBody = new FormControl('', { nonNullable: true });
  readonly replying = signal(false);
  readonly openId = signal<number | null>(null);
  readonly myId = computed(() => this.auth.currentUser()?.id ?? null);
  readonly current = computed(() => this.notes().find((n) => n.id === this.openId()) ?? null);
  readonly ordered = computed(() => [...this.notes()].sort((a, b) => b.last_activity_at.localeCompare(a.last_activity_at)));
  readonly others = computed(() =>
    this.recipients()
      .filter((r) => r.user_id !== this.auth.currentUser()?.id)
      .sort((a, b) => Number(a.always) - Number(b.always) || a.name.localeCompare(b.name, 'sr')),
  );

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = Number(params.get('note'));
      this.openId.set(id > 0 ? id : null);
      this.replyBody.reset('');
      if (!this.loading()) this.markOpenRead();
    });
    let seen = this.inbox.receivedCount();
    effect(() => {
      const count = this.inbox.receivedCount();
      if (count === seen) return;
      seen = count;
      untracked(() => this.load(true));
    });
    this.load();
    this.notesService.recipients().subscribe((list) => {
      this.recipients.set(list);
      this.selected.set(new Set(this.selectableIds()));
    });
  }

  open(note: StaffNote): void {
    void this.router.navigate([], { queryParams: { note: note.id } });
  }

  back(): void {
    void this.router.navigate([], { queryParams: { note: null } });
  }

  lastLine(note: StaffNote): string {
    const last = note.replies.at(-1);
    return last ? `${this.firstName(last.author?.name ?? 'Neko')}: ${last.body}` : note.body;
  }

  startTopic(): void {
    this.title.reset('');
    this.body.reset('');
    this.error.set(null);
    this.selected.set(new Set(this.selectableIds()));
    this.composing.set(true);
  }

  send(): void {
    if (this.title.invalid || this.body.invalid) {
      this.error.set('Upiši temu i poruku.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.notesService.create(this.title.value.trim(), this.body.value.trim(), [...this.selected()]).subscribe({
      next: (note) => {
        this.saving.set(false);
        this.composing.set(false);
        this.notes.update((list) => [note, ...list]);
        this.toast.success(note.recipients.length ? `Tema je otvorena. Obavešteni: ${note.recipients.length}.` : 'Tema je otvorena.');
        this.open(note);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(err, 'Tema nije sačuvana.'));
      },
    });
  }

  sendReply(note: StaffNote): void {
    const body = this.replyBody.value.trim();
    if (!body) return;
    this.replying.set(true);
    this.notesService.reply(note.id, body).subscribe({
      next: (updated) => {
        this.replying.set(false);
        this.replyBody.reset('');
        this.replace(updated);
        this.notesService.refreshUnreadCount();
      },
      error: (err) => {
        this.replying.set(false);
        this.toast.error(apiErrorMessage(err, 'Odgovor nije poslat.'));
      },
    });
  }

  onReplyKey(event: KeyboardEvent, note: StaffNote): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendReply(note);
    }
  }

  take(note: StaffNote): void {
    this.notesService.take(note.id).subscribe({
      next: (updated) => {
        this.replace(updated);
        this.notesService.refreshUnreadCount();
      },
      error: (err) => {
        this.toast.error(apiErrorMessage(err, 'Nije uspelo.'));
        this.load();
      },
    });
  }

  async toggleResolved(note: StaffNote): Promise<void> {
    if (note.status !== 'done') {
      const ok = await this.confirm.confirm({
        title: 'Tema je rešena',
        message: `Označiti „${note.title}" kao urađeno? Svi vide da je rešeno; tema može ponovo da se otvori.`,
        confirmLabel: 'Urađeno',
        cancelLabel: 'Ne',
        danger: false,
      });
      if (!ok) return;
    }
    this.notesService.toggleResolved(note.id).subscribe({
      next: (updated) => {
        this.replace(updated);
        this.notesService.refreshUnreadCount();
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Nije uspelo.')),
    });
  }

  async remove(note: StaffNote): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Brisanje teme', message: `Obrisati temu „${note.title}" sa svim odgovorima? Ovo ne može da se vrati.`, confirmLabel: 'Obriši' });
    if (!ok) return;
    this.notesService.delete(note.id).subscribe({
      next: () => {
        this.notes.update((list) => list.filter((n) => n.id !== note.id));
        this.back();
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Brisanje nije uspelo.')),
    });
  }

  noAccount(name: string): void {
    this.toast.info(`${this.firstName(name)} nema upisan email, pa ne može da dobije obaveštenje. Upiši ga u Zaposleni → izmena.`);
  }

  firstName(name: string): string {
    return name.split(' ')[0];
  }

  names(list: string[]): string {
    return list.map((n) => this.firstName(n)).join(', ');
  }

  toggle(id: number): void {
    this.selected.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  private selectableIds(): number[] {
    return this.others()
      .map((r) => r.user_id)
      .filter((id): id is number => id !== null);
  }

  private markOpenRead(): void {
    const note = this.current();
    if (!note?.unread) return;
    this.notesService.markRead(note.id).subscribe({
      next: (updated) => {
        this.replace(updated);
        this.notesService.refreshUnreadCount();
      },
      error: () => undefined,
    });
  }

  private replace(updated: StaffNote): void {
    this.notes.update((list) => list.map((n) => (n.id === updated.id ? updated : n)));
  }

  private load(quiet = false): void {
    if (!quiet) this.loading.set(true);
    this.notesService.list(quiet).subscribe({
      next: (list) => {
        this.notes.set(list);
        this.loading.set(false);
        this.markOpenRead();
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'Učitavanje beleški nije uspelo.'));
        this.loading.set(false);
      },
    });
  }
}
