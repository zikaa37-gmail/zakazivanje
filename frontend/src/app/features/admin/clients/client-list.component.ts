import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { Client, ClientPayload } from '../../../core/models/client.model';
import { COMMUNICATION_OPTIONS, CommunicationChannel, GENDER_OPTIONS, Gender } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { ClientService } from '../../../core/services/client.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { StaffMember } from '../../../core/models/staff.model';
import { StaffService } from '../../../core/services/staff.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { DataListComponent } from '../../../shared/components/data-list/data-list.component';
import { DataRowComponent } from '../../../shared/components/data-row/data-row.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { RowAction, RowActionsComponent } from '../../../shared/components/row-actions/row-actions.component';
import { ButtonDirective } from '../../../shared/directives/button.directive';
import { IconDirective } from '../../../shared/directives/icon.directive';
import { InputDirective } from '../../../shared/directives/input.directive';

@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, ButtonDirective, DataListComponent, DataRowComponent, ErrorMessageComponent, IconDirective, InputDirective, ModalComponent, RowActionsComponent],
  templateUrl: './client-list.component.html',
})
export class ClientListComponent {
  private fb = inject(FormBuilder);
  private clientService = inject(ClientService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  private staffService = inject(StaffService);
  readonly stylists = signal<StaffMember[]>([]);

  readonly columns = 'minmax(0, 2fr) minmax(0, 1.2fr) minmax(0, 1.6fr) 6.5rem 2.5rem';
  readonly communication = COMMUNICATION_OPTIONS;
  readonly search = new FormControl('', { nonNullable: true });
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly clients = signal<Client[]>([]);
  readonly page = signal(1);
  readonly lastPage = signal(1);
  readonly total = signal(0);

  readonly editing = signal<Client | null>(null);
  readonly modalOpen = signal(false);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);

  readonly genders = GENDER_OPTIONS;

  readonly form = this.fb.group({
    first_name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
    last_name: this.fb.nonNullable.control('', Validators.required),
    phone: this.fb.nonNullable.control('', Validators.required),
    email: this.fb.control<string | null>(null, Validators.email),
    whatsapp_number: this.fb.control<string | null>(null),
    preferred_communication: this.fb.nonNullable.control<CommunicationChannel>('whatsapp'),
    gender: this.fb.control<Gender | null>(null),
    favorite_staff_member_id: this.fb.control<number | null>(null),
    note: this.fb.control<string | null>(null),
  });

  readonly rowActions: RowAction[] = [
    { id: 'edit', label: 'Izmeni', icon: 'edit' },
    { id: 'call', label: 'Pozovi', icon: 'phone' },
    ...(inject(AuthService).isOwner() ? [{ id: 'delete', label: 'Obriši', icon: 'trash' as const, danger: true }] : []),
  ];

  constructor() {
    this.staffService.list().subscribe((staff) => this.stylists.set(staff.filter((m) => m.active)));
    this.load();
    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => this.load(1));
  }

  load(page = this.page()): void {
    this.loading.set(true);
    this.error.set(null);
    this.clientService.list(this.search.value.trim(), page).subscribe({
      next: (result) => {
        this.clients.set(result.data);
        this.page.set(result.current_page);
        this.lastPage.set(result.last_page);
        this.total.set(result.total);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'Učitavanje klijenata nije uspelo.'));
        this.loading.set(false);
      },
    });
  }

  initials(client: Client): string {
    return `${client.first_name[0] ?? ''}${client.last_name[0] ?? ''}`.toUpperCase();
  }

  onAction(client: Client, action: string): void {
    if (action === 'edit') this.openForm(client);
    if (action === 'call' && client.phone) window.location.href = `tel:${client.phone.replace(/\s/g, '')}`;
    if (action === 'delete') this.remove(client);
  }

  openForm(client: Client | null = null): void {
    this.editing.set(client);
    this.formError.set(null);
    this.form.reset({
      first_name: client?.first_name ?? '',
      last_name: client?.last_name ?? '',
      phone: client?.phone ?? '',
      email: client?.email ?? null,
      whatsapp_number: client?.whatsapp_number ?? null,
      preferred_communication: client?.preferred_communication ?? 'whatsapp',
      gender: client?.gender ?? null,
      favorite_staff_member_id: client?.favorite_staff_member_id ?? null,
      note: client?.note ?? null,
    });
    this.modalOpen.set(true);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Unesi ime, prezime i telefon.');
      return;
    }

    const value = this.form.getRawValue();
    const payload: ClientPayload = {
      ...value,
      email: value.email?.trim() || null,
      whatsapp_number: value.whatsapp_number?.trim() || null,
      note: value.note?.trim() || null,
    };

    const client = this.editing();
    this.saving.set(true);
    this.formError.set(null);
    (client ? this.clientService.update(client.id, payload) : this.clientService.create(payload)).subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success('Klijent je sačuvan.');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(apiErrorMessage(err, 'Čuvanje nije uspelo.'));
      },
    });
  }

  private async remove(client: Client): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Brisanje klijenta',
      message: `Obrisati klijenta ${client.first_name} ${client.last_name}?`,
      confirmLabel: 'Obriši',
    });
    if (!ok) return;

    this.clientService.delete(client.id).subscribe({
      next: () => {
        this.toast.success('Klijent je obrisan.');
        this.load();
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Brisanje nije uspelo.')),
    });
  }
}
