import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ABSENCE_STATUS, ABSENCE_TYPES, AbsenceType, AffectedAppointment, ColleagueRef, StaffAbsence } from '../../../core/models/staff-absence.model';
import { StaffMember } from '../../../core/models/staff.model';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { StaffAbsenceService } from '../../../core/services/staff-absence.service';
import { StaffService } from '../../../core/services/staff.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { contactHref } from '../../../core/utils/contact';
import { longDate, timeOf, today } from '../../../core/utils/dates';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { ButtonDirective } from '../../../shared/directives/button.directive';
import { IconDirective } from '../../../shared/directives/icon.directive';
import { InputDirective } from '../../../shared/directives/input.directive';
import { AppointmentActionsService } from '../appointments/appointment-actions.service';

@Component({
  selector: 'app-absences',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, ButtonDirective, ErrorMessageComponent, IconDirective, InputDirective],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Odsustva</h1>
        <p class="page-subtitle">Bolovanje, odmor ili „ne radim danas". Upisuje bilo ko, a odobrava vlasnik ili administrativni radnik. Termini tog dana se prebacuju kolegi ili se klijent zamoli da sam pomeri.</p>
      </div>
    </div>

    <form class="card mb-4 flex flex-col gap-3" (submit)="$event.preventDefault(); save()" novalidate data-testid="absence-form">
      <div class="form-grid">
        <div class="field">
          <label for="absence-staff">Ko</label>
          <select id="absence-staff" appInput [formControl]="staffId" data-testid="absence-staff">
            @for (m of staff(); track m.id) {
              <option [ngValue]="m.id">{{ m.first_name }} {{ m.last_name }}</option>
            }
          </select>
        </div>
        <div class="field">
          <span class="text-sm font-semibold">Razlog</span>
          <div class="chip-group">
            @for (t of types; track t.value) {
              <button type="button" class="chip" [class.selected]="type() === t.value" [attr.aria-pressed]="type() === t.value" (click)="type.set(t.value)" [attr.data-testid]="'absence-type-' + t.value">{{ t.label }}</button>
            }
          </div>
        </div>
        <div class="field">
          <label for="absence-from">Od</label>
          <input id="absence-from" appInput type="date" [min]="todayDate" [formControl]="from" (change)="syncTo()" data-testid="absence-from" />
        </div>
        <div class="field">
          <label for="absence-to">Do (uključujući)</label>
          <input id="absence-to" appInput type="date" [min]="from.value" [formControl]="to" data-testid="absence-to" />
        </div>
      </div>
      <div class="field">
        <label for="absence-note">Napomena</label>
        <input id="absence-note" appInput [formControl]="note" placeholder="npr. temperatura, javljam se sutra" data-testid="absence-note" />
      </div>
      <app-error-message [message]="formError()" />
      <div class="flex flex-wrap items-center gap-3">
        <app-button type="submit" size="s" [loading]="saving()" data-testid="absence-save">{{ auth.isManager() ? 'Upiši odsustvo' : 'Pošalji na odobrenje' }}</app-button>
        <span class="text-xs muted">{{ auth.isManager() ? 'Dan se odmah blokira za zakazivanje.' : 'Vlasnik ili administrativni radnik dobija obaveštenje i odobrava.' }}</span>
      </div>
    </form>

    @if (loading() && absences().length === 0) {
    } @else if (absences().length === 0) {
      <div class="card empty-state">Nema prijavljenih odsustava.</div>
    } @else {
      <div class="flex flex-col gap-3">
        @for (a of absences(); track a.id) {
          <div class="card flex flex-col gap-3" [attr.data-testid]="'absence-' + a.id">
            <div class="flex flex-wrap items-start gap-2">
              <span class="color-dot mt-1.5" [style.background]="a.staff_member.color || 'var(--color-primary)'"></span>
              <div class="min-w-0 flex-1">
                <div class="font-semibold">{{ a.staff_member.first_name }} {{ a.staff_member.last_name }} · {{ typeLabel(a.type) }}</div>
                <div class="text-sm">{{ period(a) }}</div>
                <div class="text-xs muted">
                  Upisao/la {{ a.requester?.first_name ?? '—' }}
                  @if (a.decider) {
                    · {{ a.status === 'approved' ? 'odobrio/la' : 'odbio/la' }} {{ a.decider.first_name }}
                  }
                  @if (a.note) {
                    · {{ a.note }}
                  }
                </div>
              </div>
              <span [class]="'badge shrink-0 ' + statuses[a.status].badge" [attr.data-testid]="'absence-status-' + a.id">{{ statuses[a.status].label }}</span>
            </div>
            <div class="flex flex-wrap gap-2">
              @if (a.status !== 'rejected') {
                <button type="button" appBtn theme="secondary" size="s" (click)="toggleAppointments(a)" [attr.data-testid]="'absence-appointments-' + a.id">
                  <span appIcon="calendar" aria-hidden="true"></span> {{ openId() === a.id ? 'Sakrij termine' : 'Termini tog perioda' }}
                </button>
              }
              @if (a.status === 'pending' && auth.isManager()) {
                <button type="button" appBtn size="s" (click)="approve(a)" [attr.data-testid]="'absence-approve-' + a.id"><span appIcon="check" aria-hidden="true"></span> Odobri</button>
                <button type="button" appBtn theme="ghost" size="s" (click)="reject(a)" [attr.data-testid]="'absence-reject-' + a.id">Odbij</button>
              }
              @if (canRemove(a)) {
                <button type="button" appBtn theme="ghost" size="s" (click)="remove(a)" [attr.data-testid]="'absence-remove-' + a.id"><span appIcon="trash" aria-hidden="true"></span> Ukloni</button>
              }
            </div>

            @if (openId() === a.id) {
              @if (affectedLoading() && affected().length === 0) {
              } @else if (affected().length === 0) {
                <div class="text-sm muted" data-testid="absence-no-appointments">Nema zakazanih termina u tom periodu.</div>
              } @else {
                <div class="flex flex-col gap-2" data-testid="absence-affected">
                  @if (a.status === 'pending') {
                    <div class="text-xs muted">Odsustvo još nije odobreno, ali termine već možeš da rešiš.</div>
                  }
                  @for (t of affected(); track t.id) {
                    <div class="rounded-lg border border-[var(--color-border)] p-3 flex flex-col gap-2" [attr.data-testid]="'affected-' + t.id">
                      <div class="flex flex-wrap items-baseline justify-between gap-2">
                        <div>
                          <div class="font-semibold">{{ when(t) }}</div>
                          <div class="text-sm">{{ t.client?.first_name }} {{ t.client?.last_name }} · <span class="muted">{{ services(t) }}</span></div>
                        </div>
                        @if (t.free_change_reason === 'salon_request') {
                          <span class="badge badge-info">Poslato klijentu</span>
                        }
                      </div>
                      @if (t.client?.phone) {
                        <div class="flex flex-wrap gap-3 text-sm">
                          @if (href('call', t)) {
                            <a [href]="href('call', t)" class="flex items-center gap-1 font-semibold" [attr.data-testid]="'affected-call-' + t.id"><span appIcon="phone" aria-hidden="true"></span>{{ t.client?.phone }}</a>
                          } @else {
                            <span class="flex items-center gap-1"><span appIcon="phone" aria-hidden="true"></span>{{ t.client?.phone }}</span>
                          }
                          @if (href('whatsapp', t)) {
                            <a [href]="href('whatsapp', t)" target="_blank" rel="noopener" class="flex items-center gap-1"><span appIcon="send" aria-hidden="true"></span>WhatsApp</a>
                          }
                          @if (href('viber', t)) {
                            <a [href]="href('viber', t)" class="flex items-center gap-1"><span appIcon="message-square" aria-hidden="true"></span>Viber</a>
                          }
                        </div>
                      }
                      <div class="flex flex-wrap items-center gap-2">
                        @for (c of t.alternatives; track c.id) {
                          <button type="button" appBtn theme="secondary" size="s" (click)="transfer(t, c)" [attr.data-testid]="'affected-transfer-' + t.id + '-' + c.id">
                            <span class="color-dot" [style.background]="c.color || 'var(--color-primary)'"></span> Prebaci: {{ c.first_name }}
                          </button>
                        } @empty {
                          <span class="text-xs muted">Niko od kolega nije slobodan u to vreme.</span>
                        }
                        <button type="button" appBtn theme="secondary" size="s" (click)="ask(t)" [attr.data-testid]="'affected-ask-' + t.id"><span appIcon="send" aria-hidden="true"></span> Pošalji da sam pomeri</button>
                        <button type="button" appBtn theme="ghost" size="s" class="text-[var(--color-danger)]" (click)="cancel(t)" [attr.data-testid]="'affected-cancel-' + t.id">Otkaži</button>
                      </div>
                    </div>
                  }
                </div>
              }
            }
          </div>
        }
      </div>
    }
  `,
})
export class AbsencesComponent {
  protected auth = inject(AuthService);
  private absenceService = inject(StaffAbsenceService);
  private staffService = inject(StaffService);
  private actions = inject(AppointmentActionsService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);

  readonly types = ABSENCE_TYPES;
  readonly statuses = ABSENCE_STATUS;
  readonly todayDate = today();

  readonly staff = signal<StaffMember[]>([]);
  readonly absences = signal<StaffAbsence[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly type = signal<AbsenceType>('sick');
  readonly openId = signal<number | null>(null);
  readonly affected = signal<AffectedAppointment[]>([]);
  readonly affectedLoading = signal(false);
  readonly myId = computed(() => this.auth.currentUser()?.id ?? null);

  readonly staffId = new FormControl<number | null>(this.auth.currentUser()?.staff_member_id ?? null, Validators.required);
  readonly from = new FormControl(today(), { nonNullable: true, validators: Validators.required });
  readonly to = new FormControl(today(), { nonNullable: true, validators: Validators.required });
  readonly note = new FormControl<string | null>(null);

  constructor() {
    this.staffService.list().subscribe((list) => {
      const active = list.filter((m) => m.active);
      this.staff.set(active);
      if (!this.staffId.value && active.length) this.staffId.setValue(active[0].id);
    });
    const requested = Number(this.route.snapshot.queryParamMap.get('absence')) || null;
    this.load(requested);
  }

  load(open: number | null = null): void {
    this.loading.set(true);
    this.absenceService.list().subscribe({
      next: (list) => {
        this.absences.set(list);
        this.loading.set(false);
        const target = list.find((a) => a.id === open);
        if (target && this.openId() !== target.id) this.toggleAppointments(target);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(apiErrorMessage(err, 'Učitavanje odsustava nije uspelo.'));
      },
    });
  }

  syncTo(): void {
    if (this.to.value < this.from.value) this.to.setValue(this.from.value);
  }

  save(): void {
    const staffId = this.staffId.value;
    if (!staffId || !this.from.value || !this.to.value) {
      this.formError.set('Izaberi zaposlenog i period.');
      return;
    }
    this.saving.set(true);
    this.formError.set(null);
    this.absenceService
      .create({ staff_member_id: staffId, starts_on: this.from.value, ends_on: this.to.value, type: this.type(), note: this.note.value?.trim() || null })
      .subscribe({
        next: (absence) => {
          this.saving.set(false);
          this.note.setValue(null);
          this.toast.success(absence.status === 'approved' ? 'Odsustvo je upisano i dan je blokiran.' : 'Odsustvo je poslato na odobrenje.');
          this.absenceService.refreshPendingCount();
          this.openId.set(null);
          this.load(absence.id);
        },
        error: (err) => {
          this.saving.set(false);
          this.formError.set(apiErrorMessage(err, 'Upis nije uspeo.'));
        },
      });
  }

  toggleAppointments(absence: StaffAbsence): void {
    if (this.openId() === absence.id) {
      this.openId.set(null);
      return;
    }
    this.openId.set(absence.id);
    this.loadAffected(absence.id);
  }

  approve(absence: StaffAbsence): void {
    this.absenceService.approve(absence.id).subscribe({
      next: () => {
        this.toast.success('Odsustvo je odobreno, dan je blokiran za zakazivanje.');
        this.load(absence.id);
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Odobravanje nije uspelo.')),
    });
  }

  async reject(absence: StaffAbsence): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Odbijanje odsustva',
      message: `Odbiti odsustvo za ${absence.staff_member.first_name} (${this.period(absence)})? Dobiće obaveštenje.`,
      confirmLabel: 'Odbij',
      cancelLabel: 'Ne',
    });
    if (!ok) return;
    this.absenceService.reject(absence.id).subscribe({
      next: () => {
        this.toast.success('Odsustvo je odbijeno.');
        this.openId.set(null);
        this.load();
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Nije uspelo.')),
    });
  }

  async remove(absence: StaffAbsence): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Uklanjanje odsustva',
      message: `Ukloniti odsustvo za ${absence.staff_member.first_name} (${this.period(absence)})? Dan se ponovo otvara za zakazivanje.`,
      confirmLabel: 'Ukloni',
      cancelLabel: 'Ne',
    });
    if (!ok) return;
    this.absenceService.remove(absence.id).subscribe({
      next: (res) => {
        this.toast.success(res.message);
        this.openId.set(null);
        this.load();
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Uklanjanje nije uspelo.')),
    });
  }

  canRemove(absence: StaffAbsence): boolean {
    return this.auth.isManager() || (absence.status === 'pending' && absence.requested_by === this.myId());
  }

  async transfer(t: AffectedAppointment, colleague: ColleagueRef): Promise<void> {
    if (await this.actions.transfer(t, colleague)) this.refreshAffected();
  }

  async ask(t: AffectedAppointment): Promise<void> {
    if (await this.actions.askClientToReschedule(t)) this.refreshAffected();
  }

  async cancel(t: AffectedAppointment): Promise<void> {
    if (await this.actions.run(t, 'cancel')) this.refreshAffected();
  }

  typeLabel(type: AbsenceType): string {
    return ABSENCE_TYPES.find((t) => t.value === type)?.label ?? 'Odsustvo';
  }

  period(a: StaffAbsence): string {
    return a.starts_on === a.ends_on ? longDate(a.starts_on) : `${longDate(a.starts_on)} – ${longDate(a.ends_on)}`;
  }

  when(t: AffectedAppointment): string {
    return `${longDate(t.starts_at)} · ${timeOf(t.starts_at)}`;
  }

  services(t: AffectedAppointment): string {
    return t.items.map((i) => i.name).join(' + ');
  }

  href(channel: 'call' | 'whatsapp' | 'viber', t: AffectedAppointment): string | null {
    return contactHref(channel, t.client?.phone);
  }

  private refreshAffected(): void {
    const id = this.openId();
    if (id) this.loadAffected(id);
  }

  private async loadAffected(id: number): Promise<void> {
    this.affected.set([]);
    this.affectedLoading.set(true);
    try {
      this.affected.set(await firstValueFrom(this.absenceService.appointments(id)));
    } catch (err) {
      this.toast.error(apiErrorMessage(err, 'Učitavanje termina nije uspelo.'));
    } finally {
      this.affectedLoading.set(false);
    }
  }
}
