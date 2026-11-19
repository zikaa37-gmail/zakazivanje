import { InfoTipComponent } from '../../../shared/components/info-tip/info-tip.component';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CANCELLATION_DISCOUNT_TYPES, CancellationDiscountType } from '../../../core/models/cancellation-fee.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, firstValueFrom } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { Client, ClientDeactivationImpact, ClientPayload, DisciplineZone, ZONES, ZONE_BY_VALUE } from '../../../core/models/client.model';
import { COMMUNICATION_OPTIONS, CommunicationChannel, GENDER_OPTIONS, Gender } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { BusinessSettingService } from '../../../core/services/business-setting.service';
import { ChatService } from '../../../core/services/chat.service';
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
import { canPlaceCalls, contactActions, openContact } from '../../../core/utils/contact';
import { ClientHistoryComponent } from './client-history.component';
import { ClientNamePipe } from '../../../shared/pipes/client-name.pipe';
import { clientName } from '../../../core/utils/client-name';

@Component({
  selector: 'app-client-list',
  imports: [InfoTipComponent, ClientNamePipe, ReactiveFormsModule, ClientHistoryComponent, ButtonComponent, ButtonDirective, DataListComponent, DataRowComponent, ErrorMessageComponent, IconDirective, InputDirective, ModalComponent, RowActionsComponent],
  templateUrl: './client-list.component.html',
})
export class ClientListComponent {
  private fb = inject(FormBuilder);
  private clientService = inject(ClientService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  private staffService = inject(StaffService);
  protected business = inject(BusinessSettingService);
  readonly feeEnabled = computed(() => this.business.settings()?.cancellation_fee_enabled ?? false);
  readonly discountTypes = CANCELLATION_DISCOUNT_TYPES;
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
    nickname: this.fb.control<string | null>(null),
    phone: this.fb.nonNullable.control('', Validators.required),
    email: this.fb.control<string | null>(null, Validators.email),
    whatsapp_number: this.fb.control<string | null>(null),
    preferred_communication: this.fb.nonNullable.control<CommunicationChannel>('whatsapp'),
    gender: this.fb.control<Gender | null>(null),
    favorite_staff_member_id: this.fb.control<number | null>(null),
    note: this.fb.control<string | null>(null),
    cancellation_discount_type: this.fb.control<CancellationDiscountType | null>(null),
    cancellation_discount_value: this.fb.control<number | null>(null, [Validators.min(0)]),
  });

  readonly zones = ZONES;
  readonly zoneInfo = ZONE_BY_VALUE;
  readonly zoneFilter = signal<DisciplineZone | null>(null);
  readonly historyId = signal<number | null>(null);
  readonly inactiveOnly = signal(false);
  private readonly isManager = inject(AuthService).isManager();

  readonly phoneDevice = canPlaceCalls();
  private chat = inject(ChatService);
  private router = inject(Router);
  private readonly baseActions: RowAction[] = [
    { id: 'history', label: 'Istorijat i zona', icon: 'activity' },
    { id: 'edit', label: 'Izmeni', icon: 'edit' },
  ];

  constructor() {
    this.staffService.list().subscribe((staff) => this.stylists.set(staff.filter((m) => m.active)));
    const history = Number(inject(ActivatedRoute).snapshot.queryParamMap.get('history'));
    if (history) this.historyId.set(history);
    this.load();
    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => this.load(1));
  }

  load(page = this.page()): void {
    this.loading.set(true);
    this.error.set(null);
    this.clientService.list(this.search.value.trim(), page, this.zoneFilter(), { active: !this.inactiveOnly() }).subscribe({
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

  filterZone(zone: DisciplineZone | null): void {
    this.zoneFilter.set(zone);
    this.load(1);
  }

  toggleInactive(): void {
    this.inactiveOnly.update((v) => !v);
    this.load(1);
  }

  onZoneChanged(client: Client): void {
    this.clients.update((list) => list.map((c) => (c.id === client.id ? { ...c, ...client } : c)));
  }

  rowActions(client: Client): RowAction[] {
    const [history, edit] = this.baseActions;
    const message: RowAction[] = client.has_account && client.active && this.chat.enabled() ? [{ id: 'message', label: 'Pošalji poruku', icon: 'message-square' }] : [];
    const status: RowAction[] = !this.isManager
      ? []
      : client.active
        ? [{ id: 'deactivate', label: 'Deaktiviraj', icon: 'lock', danger: true }]
        : [{ id: 'activate', label: 'Aktiviraj', icon: 'unlock' }];
    return [history, edit, ...message, ...contactActions(client.phone), ...status];
  }

  initials(client: Client): string {
    return `${client.first_name[0] ?? ''}${client.last_name[0] ?? ''}`.toUpperCase();
  }

  onAction(client: Client, action: string): void {
    if (action === 'history') this.historyId.set(client.id);
    if (action === 'edit') this.openForm(client);
    if (action === 'message') void this.router.navigate(['/admin/chat'], { queryParams: { client: client.id, name: clientName(client) } });
    openContact(action, client.phone);
    if (action === 'deactivate') void this.deactivate(client);
    if (action === 'activate') void this.activate(client);
  }

  openForm(client: Client | null = null): void {
    this.editing.set(client);
    this.formError.set(null);
    this.form.reset({
      first_name: client?.first_name ?? '',
      last_name: client?.last_name ?? '',
      nickname: client?.nickname ?? null,
      phone: client?.phone ?? '',
      email: client?.email ?? null,
      whatsapp_number: client?.whatsapp_number ?? null,
      preferred_communication: client?.preferred_communication ?? 'whatsapp',
      gender: client?.gender ?? null,
      favorite_staff_member_id: client?.favorite_staff_member_id ?? null,
      note: client?.note ?? null,
      cancellation_discount_type: client?.cancellation_discount_type ?? null,
      cancellation_discount_value: client?.cancellation_discount_value ?? null,
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
      nickname: value.nickname?.trim() || null,
      email: value.email?.trim() || null,
      whatsapp_number: value.whatsapp_number?.trim() || null,
      note: value.note?.trim() || null,
      cancellation_discount_value: value.cancellation_discount_type && value.cancellation_discount_type !== 'exempt' && value.cancellation_discount_value !== null ? Number(value.cancellation_discount_value) : null,
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

  private async deactivate(client: Client): Promise<void> {
    let impact: ClientDeactivationImpact;
    try {
      impact = await firstValueFrom(this.clientService.deactivateCheck(client.id));
    } catch (err) {
      this.toast.error(apiErrorMessage(err, 'Provera nije uspela.'));
      return;
    }
    const name = clientName(client);
    const notes = [
      impact.future > 0 ? `Otkazuje se zakazanih termina: ${impact.future}, a ta vremena postaju slobodna.` : '',
      impact.balance > 0 || impact.gift_cards > 0 ? 'Uplata unapred i poklon kartice ostaju sačuvane i vraćaju se ako ga ponovo aktiviraš.' : '',
    ].filter(Boolean);
    const ok = await this.confirm.confirm({
      title: 'Deaktivacija klijenta',
      message: [`Deaktivirati klijenta ${name}? Neće moći da se prijavi ni da zakazuje, a istorija ostaje.`, ...notes].join(' '),
      confirmLabel: 'Deaktiviraj',
    });
    if (!ok) return;

    this.clientService.setActive(client.id, false, impact.future > 0).subscribe({
      next: () => {
        this.toast.success('Klijent je deaktiviran.');
        this.load();
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Deaktivacija nije uspela.')),
    });
  }

  private async activate(client: Client): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Aktivacija klijenta',
      message: `Ponovo aktivirati klijenta ${clientName(client)}? Moći će da se prijavi i zakazuje.`,
      confirmLabel: 'Aktiviraj',
      danger: false,
    });
    if (!ok) return;

    this.clientService.setActive(client.id, true).subscribe({
      next: () => {
        this.toast.success('Klijent je ponovo aktivan.');
        this.load();
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Aktivacija nije uspela.')),
    });
  }
}
