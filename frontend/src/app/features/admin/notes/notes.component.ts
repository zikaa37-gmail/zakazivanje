import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { NoteRecipient, StaffNote, StaffNoteService } from '../../../core/services/staff-note.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { ButtonDirective } from '../../../shared/directives/button.directive';
import { IconDirective } from '../../../shared/directives/icon.directive';
import { InputDirective } from '../../../shared/directives/input.directive';
import { SrDateTimePipe } from '../../../shared/pipes/sr-date-time.pipe';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, ButtonDirective, ErrorMessageComponent, IconDirective, InputDirective, SrDateTimePipe],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Beleške</h1>
        <p class="page-subtitle">Šta nedostaje, šta se pokvarilo, šta treba da znaju ostali. „Preuzimam" — da svi vide da se neko već bavi time.</p>
      </div>
    </div>

    <form class="card mb-4 flex flex-col gap-3" (submit)="$event.preventDefault(); send()" novalidate data-testid="note-form">
      <textarea appInput size="m" rows="3" [formControl]="body" placeholder="npr. Nestalo je farbe 7.1, pokvario se fen u drugoj stolici…" aria-label="Nova beleška" data-testid="note-body"></textarea>
      <div>
        <div class="text-sm font-semibold mb-1">Obavesti</div>
        <div class="chip-group">
          @for (r of others(); track r.name + r.staff_member_id) {
            @if (r.user_id === null) {
              <button type="button" class="chip opacity-50" (click)="noAccount(r.name)" [attr.data-testid]="'note-recipient-none-' + r.staff_member_id">{{ firstName(r.name) }}</button>
            } @else if (r.always) {
              <span class="chip selected" title="Uvek dobija obaveštenje (Podešavanja salona → Obaveštenja)" [attr.data-testid]="'note-recipient-' + r.user_id"><span appIcon="lock" [iconSize]="13" aria-hidden="true"></span> {{ firstName(r.name) }}</span>
            } @else {
              <button type="button" class="chip" [class.selected]="selected().has(r.user_id)" [attr.aria-pressed]="selected().has(r.user_id)" (click)="toggle(r.user_id)" [attr.data-testid]="'note-recipient-' + r.user_id">
                @if (selected().has(r.user_id)) {
                  <span appIcon="check" [iconSize]="13" aria-hidden="true"></span>
                }
                {{ firstName(r.name) }}
              </button>
            }
          }
        </div>
      </div>
      <app-error-message [message]="error()" />
      <div>
        <app-button type="submit" size="s" [loading]="saving()" data-testid="note-send"><span appIcon="send" aria-hidden="true"></span> Pošalji</app-button>
      </div>
    </form>

    @if (loading() && notes().length === 0) {
    } @else if (notes().length === 0) {
      <div class="card empty-state">Još nema beleški.</div>
    } @else {
      <div class="flex flex-col gap-3">
        @for (n of notes(); track n.id) {
          <div class="card flex flex-col gap-2" [class.opacity-60]="n.status === 'done'" [class.note-unread]="n.unread && n.status !== 'done'" [attr.data-testid]="'note-' + n.id">
            <div class="flex items-start gap-2">
              <div class="min-w-0 flex-1">
                <div class="text-sm muted">{{ firstName(n.author?.name ?? 'Neko') }} · {{ n.created_at | srDateTime }}</div>
                <p class="whitespace-pre-line" [class.line-through]="n.status === 'done'">{{ n.body }}</p>
              </div>
              @switch (n.status) {
                @case ('done') {
                  <span class="badge badge-success shrink-0" [attr.data-testid]="'note-status-' + n.id">Urađeno</span>
                }
                @case ('taken') {
                  <span class="badge badge-info shrink-0" [attr.data-testid]="'note-status-' + n.id">Preuzeo/la {{ firstName(n.taken_by!.name) }}</span>
                }
                @default {
                  <span class="badge badge-warning shrink-0" [attr.data-testid]="'note-status-' + n.id">Novo</span>
                }
              }
            </div>
            <div class="text-xs muted">
              @if (n.status === 'done') {
                Uradio/la {{ firstName(n.resolver ?? '') }} {{ n.resolved_at | srDateTime }} ·
              }
              {{ n.readers.length ? 'Pročitali: ' + names(n.readers) : 'Još niko nije pročitao' }}
            </div>
            <div class="flex flex-wrap gap-2">
              @if (n.unread && n.status !== 'done') {
                <button type="button" appBtn theme="secondary" size="s" (click)="read(n)" [attr.data-testid]="'note-read-' + n.id"><span appIcon="eye" aria-hidden="true"></span> Pročitano</button>
              }
              @if (n.status === 'open') {
                <button type="button" appBtn theme="secondary" size="s" (click)="take(n)" [attr.data-testid]="'note-take-' + n.id"><span appIcon="user" aria-hidden="true"></span> Preuzimam</button>
              } @else if (n.status === 'taken' && n.taken_by?.id === myId()) {
                <button type="button" appBtn theme="ghost" size="s" (click)="take(n)" [attr.data-testid]="'note-untake-' + n.id">Ne preuzimam</button>
              }
              <button type="button" appBtn [theme]="n.status === 'done' ? 'ghost' : 'primary'" size="s" (click)="toggleResolved(n)" [attr.data-testid]="'note-resolve-' + n.id">
                <span [appIcon]="n.status === 'done' ? 'rotate-ccw' : 'check'" aria-hidden="true"></span> {{ n.status === 'done' ? 'Vrati kao otvoreno' : 'Urađeno' }}
              </button>
              @if (n.can_delete) {
                <button type="button" appBtn theme="ghost" size="s" (click)="remove(n)" [attr.data-testid]="'note-delete-' + n.id"><span appIcon="trash" aria-hidden="true"></span> Obriši</button>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: `
    .note-unread {
      border-left: 4px solid var(--color-warning);
    }
  `,
})
export class NotesComponent {
  private notesService = inject(StaffNoteService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  readonly body = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] });
  readonly notes = signal<StaffNote[]>([]);
  readonly recipients = signal<NoteRecipient[]>([]);
  readonly selected = signal<Set<number>>(new Set());
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly others = computed(() =>
    this.recipients()
      .filter((r) => r.user_id !== this.auth.currentUser()?.id)
      .sort((a, b) => Number(a.always) - Number(b.always) || a.name.localeCompare(b.name, 'sr')),
  );

  constructor() {
    this.load();
    this.notesService.recipients().subscribe((list) => {
      this.recipients.set(list);
      this.selected.set(new Set(this.selectableIds()));
    });
  }

  readonly myId = computed(() => this.auth.currentUser()?.id ?? null);

  names(list: string[]): string {
    return list.map((n) => this.firstName(n)).join(', ');
  }

  read(note: StaffNote): void {
    this.notesService.markRead(note.id).subscribe({
      next: (updated) => {
        this.replace(updated);
        this.notesService.refreshUnreadCount();
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Nije uspelo.')),
    });
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

  private replace(updated: StaffNote): void {
    this.notes.update((list) => list.map((n) => (n.id === updated.id ? updated : n)));
  }

  noAccount(name: string): void {
    this.toast.info(`${this.firstName(name)} nema upisan email, pa ne može da dobije obaveštenje. Upiši ga u Zaposleni → izmena.`);
  }

  firstName(name: string): string {
    return name.split(' ')[0];
  }

  private selectableIds(): number[] {
    return this.others()
      .map((r) => r.user_id)
      .filter((id): id is number => id !== null);
  }

  toggle(id: number): void {
    this.selected.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  send(): void {
    if (this.body.invalid) {
      this.error.set('Napiši belešku.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.notesService.create(this.body.value.trim(), [...this.selected()]).subscribe({
      next: (note) => {
        this.saving.set(false);
        this.body.reset('');
        this.selected.set(new Set(this.selectableIds()));
        this.notes.update((list) => [note, ...list]);
        this.toast.success(note.recipients.length ? `Poslato. Obavešteni: ${note.recipients.length}.` : 'Poslato.');
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(err, 'Beleška nije sačuvana.'));
      },
    });
  }

  toggleResolved(note: StaffNote): void {
    this.notesService.toggleResolved(note.id).subscribe({
      next: (updated) => {
        this.replace(updated);
        this.notesService.refreshUnreadCount();
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Nije uspelo.')),
    });
  }

  async remove(note: StaffNote): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Brisanje beleške', message: 'Obrisati ovu belešku?', confirmLabel: 'Obriši' });
    if (!ok) return;
    this.notesService.delete(note.id).subscribe({
      next: () => this.notes.update((list) => list.filter((n) => n.id !== note.id)),
      error: (err) => this.toast.error(apiErrorMessage(err, 'Brisanje nije uspelo.')),
    });
  }

  private load(): void {
    this.loading.set(true);
    this.notesService.list().subscribe({
      next: (list) => {
        this.notes.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'Učitavanje beleški nije uspelo.'));
        this.loading.set(false);
      },
    });
  }
}
