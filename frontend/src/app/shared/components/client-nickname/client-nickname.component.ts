import { Component, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ClientService } from '../../../core/services/client.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { ButtonDirective } from '../../directives/button.directive';
import { IconDirective } from '../../directives/icon.directive';
import { InputDirective } from '../../directives/input.directive';

@Component({
  selector: 'app-client-nickname',
  imports: [ReactiveFormsModule, ButtonDirective, IconDirective, InputDirective],
  template: `
    @if (editing()) {
      <form class="flex flex-wrap items-center gap-2" (submit)="$event.preventDefault(); save()" data-testid="client-nickname-form">
        <input appInput size="s" class="flex-1 min-w-[10rem]" [formControl]="control" maxlength="60" placeholder="npr. Pera Plavi" aria-label="Nadimak" data-testid="client-nickname-input" />
        <button type="submit" appBtn size="s" [disabled]="saving()" data-testid="client-nickname-save">Sačuvaj</button>
        <button type="button" appBtn theme="secondary" size="s" (click)="editing.set(false)">Odustani</button>
      </form>
      <p class="text-xs muted mt-1">Nadimak vidi samo salon i prikazuje se umesto imena i prezimena. Klijent ga ne vidi.</p>
    } @else {
      <button type="button" class="inline-flex items-center gap-1 text-sm text-[var(--color-primary-text)]" (click)="edit()" data-testid="client-nickname-edit">
        <span appIcon="edit" [iconSize]="14" aria-hidden="true"></span>
        @if (nickname()) {
          Nadimak: <strong>{{ nickname() }}</strong> · {{ fullName() }}
        } @else {
          Dodaj nadimak
        }
      </button>
    }
  `,
})
export class ClientNicknameComponent {
  private clients = inject(ClientService);
  private toast = inject(ToastService);

  readonly clientId = input.required<number>();
  readonly nickname = input<string | null | undefined>(null);
  readonly fullName = input<string>('');
  readonly saved = output<string | null>();

  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly control = new FormControl<string>('', { nonNullable: true });

  edit(): void {
    this.control.setValue(this.nickname() ?? '');
    this.editing.set(true);
  }

  save(): void {
    const nickname = this.control.value.trim() || null;
    this.saving.set(true);
    this.clients.setNickname(this.clientId(), nickname).subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(false);
        this.saved.emit(nickname);
        this.toast.success(nickname ? 'Nadimak je sačuvan.' : 'Nadimak je obrisan.');
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(apiErrorMessage(err, 'Nadimak nije sačuvan.'));
      },
    });
  }
}
