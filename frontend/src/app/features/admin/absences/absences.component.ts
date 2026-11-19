import { InfoTipComponent } from '../../../shared/components/info-tip/info-tip.component';
import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ABSENCE_STATUS, ABSENCE_TYPES, AbsenceType, AffectedAppointment, StaffAbsence } from '../../../core/models/staff-absence.model';
import { StaffMember } from '../../../core/models/staff.model';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { StaffAbsenceService } from '../../../core/services/staff-absence.service';
import { StaffService } from '../../../core/services/staff.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { longDate, today } from '../../../core/utils/dates';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { DateRangeComponent } from '../../../shared/components/date-range/date-range.component';
import { ButtonDirective } from '../../../shared/directives/button.directive';
import { IconDirective } from '../../../shared/directives/icon.directive';
import { InputDirective } from '../../../shared/directives/input.directive';
import { AffectedAppointmentsComponent } from '../appointments/affected-appointments.component';

@Component({
  selector: 'app-absences',
  imports: [InfoTipComponent, AffectedAppointmentsComponent, ReactiveFormsModule, ButtonComponent, ButtonDirective, DateRangeComponent, ErrorMessageComponent, IconDirective, InputDirective],
  template: `
    <div class="page-header">
      <div>
        <div class="page-title-row"><h1 class="page-title">Odsustva</h1><app-info-tip heading="Odsustva"><p>Bolovanje, odmor ili „ne radim danas". Upisuje bilo ko iz osoblja, a odobrava vlasnik ili menadžer — njihov upis je odmah odobren.</p><p class="mt-2">Odobreni dani se zatvaraju za zakazivanje. Termine iz tog perioda prebacite kolegi, zamolite klijenta da sam pomeri ili otkažite („Termini tog perioda"). Pogrešan datum ispravljate sa „Izmeni".</p></app-info-tip></div>
      </div>
    </div>

    <form #absenceForm class="card mb-4 flex flex-col gap-3" (submit)="$event.preventDefault(); save()" novalidate data-testid="absence-form">
      @if (editing(); as e) {
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-base font-semibold">Izmena odsustva · {{ e.staff_member.first_name }} {{ e.staff_member.last_name }}</h2>
          <button type="button" appBtn theme="ghost" size="s" (click)="cancelEdit()" data-testid="absence-edit-cancel">Odustani</button>
        </div>
      } @else {
        <h2 class="text-base font-semibold">Novo odsustvo</h2>
      }
      <div class="form-grid">
        @if (!editing()) {
        <div class="field">
          <label for="absence-staff">Ko</label>
          <select id="absence-staff" appInput [formControl]="staffId" data-testid="absence-staff">
            @for (m of staff(); track m.id) {
              <option [ngValue]="m.id">{{ m.first_name }} {{ m.last_name }}</option>
            }
          </select>
        </div>
        }
        <div class="field">
          <span class="text-sm font-semibold">Razlog</span>
          <div class="chip-group">
            @for (t of types; track t.value) {
              <button type="button" class="chip" [class.selected]="type() === t.value" [attr.aria-pressed]="type() === t.value" (click)="type.set(t.value)" [attr.data-testid]="'absence-type-' + t.value">{{ t.label }}</button>
            }
          </div>
        </div>
      </div>
      <div class="field">
        <span class="text-sm font-semibold">Period (klikni prvi, pa poslednji dan)</span>
        <app-date-range [from]="from" [to]="to" [min]="rangeMin()" data-testid="absence-range" />
      </div>
      <div class="field">
        <label for="absence-note">Napomena</label>
        <input id="absence-note" appInput [formControl]="note" placeholder="npr. temperatura, javljam se sutra" data-testid="absence-note" />
      </div>
      <app-error-message [message]="formError()" />
      <div class="flex flex-wrap items-center gap-3">
        @if (editing()) {
          <app-button type="submit" size="s" [loading]="saving()" data-testid="absence-save">Sačuvaj izmene</app-button>
        } @else {
          <app-button type="submit" size="s" [loading]="saving()" data-testid="absence-save">{{ auth.isManager() ? 'Upiši odsustvo' : 'Pošalji na odobrenje' }}</app-button>
          <span class="text-xs muted">{{ auth.isManager() ? 'Dan se odmah blokira za zakazivanje.' : 'Vlasnik ili menadžer dobija obaveštenje i odobrava.' }}</span>
        }
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
              @if (canEdit(a)) {
                <button type="button" appBtn theme="secondary" size="s" (click)="edit(a)" [attr.data-testid]="'absence-edit-' + a.id"><span appIcon="edit" aria-hidden="true"></span> Izmeni</button>
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
                @if (a.status === 'pending') {
                  <div class="text-xs muted">Odsustvo još nije odobreno, ali termine već možeš da rešiš.</div>
                }
                <app-affected-appointments [appointments]="affected()" (changed)="refreshAffected()" />
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
  readonly editing = signal<StaffAbsence | null>(null);
  readonly rangeMin = computed(() => {
    const start = this.editing()?.starts_on;
    return start && start < this.todayDate ? start : this.todayDate;
  });
  private readonly absenceForm = viewChild<ElementRef<HTMLFormElement>>('absenceForm');

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

  edit(absence: StaffAbsence): void {
    this.editing.set(absence);
    this.type.set(absence.type);
    this.from.setValue(absence.starts_on);
    this.to.setValue(absence.ends_on);
    this.note.setValue(absence.note);
    this.formError.set(null);
    this.absenceForm()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  cancelEdit(): void {
    this.editing.set(null);
    this.from.setValue(today());
    this.to.setValue(today());
    this.note.setValue(null);
    this.formError.set(null);
  }

  canEdit(absence: StaffAbsence): boolean {
    if (absence.status === 'rejected') return false;
    return this.auth.isManager() || (absence.status === 'pending' && absence.requested_by === this.myId());
  }

  save(): void {
    const editing = this.editing();
    if (editing) {
      this.saveEdit(editing);
      return;
    }
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

  private saveEdit(absence: StaffAbsence): void {
    this.saving.set(true);
    this.formError.set(null);
    this.absenceService
      .update(absence.id, { starts_on: this.from.value, ends_on: this.to.value, type: this.type(), note: this.note.value?.trim() || null })
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.toast.success('Odsustvo je izmenjeno.');
          this.cancelEdit();
          this.openId.set(null);
          this.load(updated.id);
        },
        error: (err) => {
          this.saving.set(false);
          this.formError.set(apiErrorMessage(err, 'Izmena nije uspela.'));
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

  async approve(absence: StaffAbsence): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Odobravanje odsustva',
      message: `Odobriti odsustvo za ${absence.staff_member.first_name} (${this.period(absence)})? Ti dani se zatvaraju za zakazivanje.`,
      confirmLabel: 'Odobri',
      cancelLabel: 'Ne',
      danger: false,
    });
    if (!ok) return;
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

  typeLabel(type: AbsenceType): string {
    return ABSENCE_TYPES.find((t) => t.value === type)?.label ?? 'Odsustvo';
  }

  period(a: StaffAbsence): string {
    return a.starts_on === a.ends_on ? longDate(a.starts_on) : `${longDate(a.starts_on)} – ${longDate(a.ends_on)}`;
  }

  refreshAffected(): void {
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
