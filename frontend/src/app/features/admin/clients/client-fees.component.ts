import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { CANCELLATION_FEE_STATUS, CancellationFee } from '../../../core/models/cancellation-fee.model';
import { PAYMENT_METHODS, PaymentMethod } from '../../../core/models/payment.model';
import { AuthService } from '../../../core/services/auth.service';
import { CancellationFeeService } from '../../../core/services/cancellation-fee.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { ButtonDirective } from '../../../shared/directives/button.directive';
import { InputDirective } from '../../../shared/directives/input.directive';
import { RsdPipe } from '../../../shared/pipes/rsd.pipe';
import { SrDateTimePipe } from '../../../shared/pipes/sr-date-time.pipe';

type EditMode = 'waive' | 'adjust';

@Component({
  selector: 'app-client-fees',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonDirective, InputDirective, RsdPipe, SrDateTimePipe],
  template: `
    @if (visible().length > 0) {
      <div class="rounded-lg border border-[var(--color-border)] p-3 flex flex-col gap-2" data-testid="client-fees">
        <div class="text-sm font-semibold">{{ title() }}</div>
        @for (fee of visible(); track fee.id) {
          <div class="flex flex-col gap-2 text-sm border-t border-[var(--color-border)] pt-2 first-of-type:border-0" [attr.data-testid]="'fee-' + fee.id">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span>
                <span [class]="'badge ' + statusInfo[fee.status].badge">{{ statusInfo[fee.status].label }}</span>
                {{ fee.late_number }}. kasno otkazivanje
                @if (fee.appointment) {
                  <span class="muted">· termin {{ fee.appointment.starts_at | srDateTime }}{{ services(fee) }}</span>
                }
              </span>
              <span class="font-semibold">
                @if (fee.base_amount !== fee.amount && fee.base_amount > 0) {
                  <s class="muted font-normal">{{ fee.base_amount | rsd }}</s>
                }
                {{ fee.amount | rsd }}
              </span>
            </div>
            @if (fee.reason) {
              <div class="muted">{{ fee.reason }}{{ fee.decider ? ' — ' + fee.decider.first_name : '' }}</div>
            }
            @if (fee.status === 'open') {
              @if (editing()?.id === fee.id) {
                <div class="flex flex-wrap items-center gap-2">
                  @if (mode() === 'adjust') {
                    <input appInput size="s" type="number" min="0" class="!w-28" [formControl]="amount" aria-label="Novi iznos" placeholder="Iznos" data-testid="fee-amount" />
                  }
                  <input appInput size="s" class="flex-1 min-w-40" [formControl]="reason" aria-label="Razlog" placeholder="Razlog (npr. bolest, hitan slučaj)" data-testid="fee-reason" />
                  <button type="button" appBtn size="s" (click)="saveEdit(fee)" data-testid="fee-save">{{ mode() === 'waive' ? 'Oprosti' : 'Sačuvaj' }}</button>
                  <button type="button" appBtn theme="ghost" size="s" (click)="editing.set(null)">Odustani</button>
                </div>
              } @else {
                <div class="flex flex-wrap items-center gap-2">
                  <span class="muted">Naplaćeno:</span>
                  @for (m of paymentMethods; track m.value) {
                    <button type="button" appBtn theme="secondary" size="s" (click)="markPaid(fee, m.value)" [attr.data-testid]="'fee-paid-' + m.value">{{ m.label }}</button>
                  }
                  @if (isManager()) {
                    <button type="button" appBtn theme="ghost" size="s" (click)="startEdit(fee, 'adjust')" data-testid="fee-adjust">Promeni iznos</button>
                    <button type="button" appBtn theme="ghost" size="s" (click)="startEdit(fee, 'waive')" data-testid="fee-waive">Oprosti</button>
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
export class ClientFeesComponent implements OnInit {
  readonly clientId = input.required<number>();
  readonly appointmentId = input<number | null>(null);
  readonly showAll = input(false);
  readonly changed = output<void>();

  private service = inject(CancellationFeeService);
  private toast = inject(ToastService);
  readonly isManager = inject(AuthService).isManager;

  readonly statusInfo = CANCELLATION_FEE_STATUS;
  readonly paymentMethods = PAYMENT_METHODS;
  readonly fees = signal<CancellationFee[]>([]);
  readonly editing = signal<CancellationFee | null>(null);
  readonly mode = signal<EditMode>('waive');
  readonly reason = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3)] });
  readonly amount = new FormControl<number | null>(null, [Validators.required, Validators.min(0)]);

  readonly visible = computed(() =>
    this.showAll() ? this.fees() : this.fees().filter((f) => f.status === 'open' || f.appointment_id === this.appointmentId()),
  );
  readonly title = computed(() => {
    const open = this.fees().filter((f) => f.status === 'open').reduce((sum, f) => sum + f.amount, 0);
    return open > 0 ? `Naknade za kasno otkazivanje · duguje ${open.toLocaleString('sr-RS')} din.` : 'Naknade za kasno otkazivanje';
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.service.list({ client_id: this.clientId() }).subscribe({ next: (list) => this.fees.set(list), error: () => this.fees.set([]) });
  }

  services(fee: CancellationFee): string {
    const names = fee.appointment?.items?.map((i) => i.name).join(' + ');
    return names ? ` · ${names}` : '';
  }

  startEdit(fee: CancellationFee, mode: EditMode): void {
    this.mode.set(mode);
    this.reason.reset('');
    this.amount.reset(fee.amount);
    this.editing.set(fee);
  }

  saveEdit(fee: CancellationFee): void {
    if (this.reason.invalid || (this.mode() === 'adjust' && this.amount.invalid)) {
      this.toast.error(this.mode() === 'adjust' ? 'Upiši iznos i razlog.' : 'Upiši razlog.');
      return;
    }
    const request = this.mode() === 'waive' ? this.service.waive(fee.id, this.reason.value.trim()) : this.service.adjust(fee.id, Number(this.amount.value), this.reason.value.trim());
    request.subscribe({
      next: (saved) => {
        this.toast.success(saved.status === 'waived' ? 'Naknada je oproštena.' : 'Iznos naknade je promenjen.');
        this.editing.set(null);
        this.done();
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Čuvanje nije uspelo.')),
    });
  }

  markPaid(fee: CancellationFee, method: PaymentMethod): void {
    this.service.markPaid(fee.id, method).subscribe({
      next: () => {
        this.toast.success('Naknada je naplaćena.');
        this.done();
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Čuvanje nije uspelo.')),
    });
  }

  private done(): void {
    this.load();
    this.changed.emit();
  }
}
