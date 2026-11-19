import { Component, computed, inject, input, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Appointment } from '../../core/models/appointment.model';
import { formatGiftCode } from '../../core/models/wallet.model';
import { ToastService } from '../../core/services/toast.service';
import { WalletService } from '../../core/services/wallet.service';
import { apiErrorMessage } from '../../core/utils/api-error';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ButtonDirective } from '../../shared/directives/button.directive';
import { IconDirective } from '../../shared/directives/icon.directive';
import { InputDirective } from '../../shared/directives/input.directive';
import { RsdPipe } from '../../shared/pipes/rsd.pipe';
import { SrDateTimePipe } from '../../shared/pipes/sr-date-time.pipe';

@Component({
  selector: 'app-client-pay-dialog',
  imports: [ReactiveFormsModule, ButtonComponent, ButtonDirective, ErrorMessageComponent, IconDirective, InputDirective, ModalComponent, RsdPipe, SrDateTimePipe],
  template: `
    <app-modal title="Plaćanje" footerMode="none" (cancelled)="closed.emit()" testId="client-pay">
      <app-error-message [message]="error()" />
      <p class="text-sm mb-3">{{ services() }} · {{ appointment().starts_at | srDateTime }}<br />Za plaćanje: <strong>{{ left() | rsd }}</strong></p>

      <div class="flex flex-col gap-2">
        @if (balance() > 0) {
          <button type="button" appBtn theme="secondary" size="m" class="justify-between" [disabled]="busy()" (click)="pay('wallet', null)" data-testid="client-pay-wallet">
            <span><span appIcon="coins" aria-hidden="true"></span> Sa stanja</span><span>{{ balance() | rsd }}</span>
          </button>
        }
        @for (c of activeCards(); track c.id) {
          <button type="button" appBtn theme="secondary" size="m" class="justify-between" [disabled]="busy()" (click)="pay('gift_card', c.code)" [attr.data-testid]="'client-pay-card-' + c.id">
            <span><span appIcon="gift" aria-hidden="true"></span> Poklon kartica {{ code(c.code) }}</span><span>{{ c.balance | rsd }}</span>
          </button>
        }
        <form class="flex gap-2" (submit)="$event.preventDefault(); payWithCode()">
          <input appInput size="m" class="flex-1 min-w-0" [formControl]="codeInput" placeholder="Kod poklon kartice" autocomplete="off" aria-label="Kod poklon kartice" data-testid="client-pay-code" />
          <app-button type="submit" size="s" [loading]="busy()" data-testid="client-pay-code-submit">Plati</app-button>
        </form>
        <p class="text-xs muted">Ako na kartici nema dovoljno, skida se koliko ima, a ostatak plaćaš u salonu.</p>
        @if (appointment().can_pay) {
          <button type="button" appBtn theme="ghost" size="s" class="self-start" (click)="ips.emit()" data-testid="client-pay-ips"><span appIcon="qr" aria-hidden="true"></span> Uplata na račun (IPS QR)</button>
        }
      </div>
    </app-modal>
  `,
})
export class ClientPayDialogComponent {
  private walletService = inject(WalletService);
  private toast = inject(ToastService);

  readonly appointment = input.required<Appointment>();
  readonly closed = output<void>();
  readonly paid = output<void>();
  readonly ips = output<void>();

  private readonly wallet = rxResource({ stream: () => this.walletService.mine() });
  readonly balance = computed(() => (this.wallet.hasValue() ? this.wallet.value().balance : 0));
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly codeInput = new FormControl('', { nonNullable: true });
  readonly code = formatGiftCode;
  readonly activeCards = computed(() => (this.wallet.hasValue() ? this.wallet.value().gift_cards.filter((c) => c.status === 'active') : []));
  readonly left = computed(() => this.appointment().amount_left ?? this.appointment().total);
  readonly services = computed(() => this.appointment().items.map((i) => i.name).join(', '));

  payWithCode(): void {
    const code = this.codeInput.value.trim();
    if (code) this.pay('gift_card', code);
  }

  pay(source: 'wallet' | 'gift_card', code: string | null): void {
    this.busy.set(true);
    this.error.set(null);
    this.walletService.payMine(this.appointment().id, source, code).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.toast.success(res.message);
        this.paid.emit();
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(apiErrorMessage(err, 'Plaćanje nije uspelo.'));
      },
    });
  }
}
