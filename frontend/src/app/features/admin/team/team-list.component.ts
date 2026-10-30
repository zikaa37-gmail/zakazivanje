import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { STAFF_ROLE_OPTIONS, StaffRole, TeamMember, TeamMemberPayload } from '../../../core/models/team.model';
import { userRoleLabel } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { TeamService } from '../../../core/services/team.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { RowAction, RowActionsComponent } from '../../../shared/components/row-actions/row-actions.component';
import { ToggleComponent } from '../../../shared/components/toggle/toggle.component';
import { ButtonDirective } from '../../../shared/directives/button.directive';
import { IconDirective } from '../../../shared/directives/icon.directive';
import { InputDirective } from '../../../shared/directives/input.directive';
import { SrDateTimePipe } from '../../../shared/pipes/sr-date-time.pipe';
import { TeamTabsComponent } from '../staff/team-tabs.component';

@Component({
  selector: 'app-team-list',
  standalone: true,
  imports: [TeamTabsComponent, ReactiveFormsModule, RouterLink, ButtonComponent, ButtonDirective, ErrorMessageComponent, IconDirective, InputDirective, ModalComponent, RowActionsComponent, SrDateTimePipe, ToggleComponent],
  templateUrl: './team-list.component.html',
})
export class TeamListComponent {
  private fb = inject(FormBuilder);
  private teamService = inject(TeamService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);

  readonly roleLabel = userRoleLabel;
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly members = signal<TeamMember[]>([]);
  readonly editing = signal<TeamMember | null>(null);
  readonly modalOpen = signal(false);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);

  readonly linked = computed(() => this.editing()?.staff_member_id != null);
  readonly roleOptions = computed(() => STAFF_ROLE_OPTIONS.filter((o) => (o.value !== 'owner' || this.auth.isOwner()) && (o.value !== 'worker' || this.linked())));
  readonly isSelf = computed(() => this.editing()?.id === this.auth.currentUser()?.id);

  readonly form = this.fb.group({
    first_name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
    last_name: this.fb.nonNullable.control('', Validators.required),
    email: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
    phone: this.fb.control<string | null>(null),
    role: this.fb.nonNullable.control<StaffRole>('manager'),
    active: this.fb.nonNullable.control(true),
    send_invite: this.fb.nonNullable.control(true),
  });

  readonly roleHint = signal(STAFF_ROLE_OPTIONS[0].hint);

  constructor() {
    this.load();
    this.form.controls.role.valueChanges.subscribe((role) => this.roleHint.set(STAFF_ROLE_OPTIONS.find((o) => o.value === role)?.hint ?? ''));
  }

  load(): void {
    this.loading.set(true);
    this.teamService.list().subscribe({
      next: (members) => {
        this.members.set(members);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'Nalozi nisu učitani.'));
        this.loading.set(false);
      },
    });
  }

  actionsFor(member: TeamMember): RowAction[] {
    const self = member.id === this.auth.currentUser()?.id;
    if (member.role === 'owner' && !this.auth.isOwner()) return [];
    return [
      { id: 'edit', label: 'Izmeni', icon: 'edit' },
      { id: 'invite', label: member.has_password ? 'Pošalji link za lozinku' : 'Pošalji pozivnicu', icon: 'send' },
      ...(member.staff_member_id === null && !self ? [{ id: 'delete', label: 'Obriši', icon: 'trash' as const, danger: true }] : []),
    ];
  }

  onAction(member: TeamMember, action: string): void {
    if (action === 'edit') this.openForm(member);
    if (action === 'invite') this.invite(member);
    if (action === 'delete') this.remove(member);
  }

  initials(member: TeamMember): string {
    return `${member.first_name[0] ?? ''}${member.last_name[0] ?? ''}`.toUpperCase();
  }

  openForm(member: TeamMember | null = null): void {
    this.editing.set(member);
    this.formError.set(null);
    this.form.enable();
    this.form.reset({
      first_name: member?.first_name ?? '',
      last_name: member?.last_name ?? '',
      email: member?.email ?? '',
      phone: member?.phone ?? null,
      role: member?.role ?? 'manager',
      active: member?.active ?? true,
      send_invite: true,
    });
    if (member?.staff_member_id != null) {
      this.form.controls.first_name.disable();
      this.form.controls.last_name.disable();
      this.form.controls.email.disable();
      this.form.controls.phone.disable();
    }
    if (this.isSelf()) {
      this.form.controls.role.disable();
    }
    this.modalOpen.set(true);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Unesi ime, prezime i ispravan email.');
      return;
    }

    const value = this.form.getRawValue();
    const member = this.editing();
    const payload: TeamMemberPayload = {
      first_name: value.first_name.trim(),
      last_name: value.last_name.trim(),
      email: value.email.trim(),
      phone: value.phone?.trim() || null,
      role: value.role,
      ...(member ? { active: value.active } : { send_invite: value.send_invite }),
    };

    this.saving.set(true);
    this.formError.set(null);
    (member ? this.teamService.update(member.id, payload) : this.teamService.create(payload)).subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success(!member && value.send_invite ? 'Nalog je napravljen i pozivnica je poslata.' : 'Nalog je sačuvan.');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(apiErrorMessage(err, 'Čuvanje nije uspelo.'));
      },
    });
  }

  private invite(member: TeamMember): void {
    this.teamService.invite(member.id).subscribe({
      next: (res) => this.toast.success(res.message),
      error: (err) => this.toast.error(apiErrorMessage(err, 'Slanje nije uspelo.')),
    });
  }

  private async remove(member: TeamMember): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Brisanje naloga',
      message: `Obrisati nalog ${member.first_name} ${member.last_name}? Više neće moći da se prijavi.`,
      confirmLabel: 'Obriši',
    });
    if (!ok) return;

    this.teamService.delete(member.id).subscribe({
      next: () => {
        this.toast.success('Nalog je obrisan.');
        this.load();
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Brisanje nije uspelo.')),
    });
  }
}
