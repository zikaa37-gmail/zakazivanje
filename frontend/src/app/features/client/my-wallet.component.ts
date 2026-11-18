import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { WALLET_KIND_LABELS, Wallet } from '../../core/models/wallet.model';
import { ToastService } from '../../core/services/toast.service';
import { WalletService } from '../../core/services/wallet.service';
import { apiErrorMessage } from '../../core/utils/api-error';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { InputDirective } from '../../shared/directives/input.directive';
import { RsdPipe } from '../../shared/pipes/rsd.pipe';
import { SrDatePipe } from '../../shared/pipes/sr-date.pipe';

@Component({
  selector: 'app-my-wallet',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, InputDirective, RsdPipe, SrDatePipe],
  template: `
    <div class="card flex flex-col gap-3" data-testid="my-wallet">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-base font-semibold">Stanje i poklon kartice</h2>
        <span class="text-lg font-bold" data-testid="my-wallet-balance">{{ wallet()?.balance ?? 0 | rsd }}</span>
      </div>
      <p class="text-sm muted">Uplate unapred i poklon kartice. Usluge se plaćaju sa stanja u salonu.</p>
      <form class="flex gap-2" (submit)="$event.preventDefault(); redeem()">
        <input appInput size="m" class="flex-1 min-w-0" [formControl]="code" placeholder="Kod poklon kartice" autocomplete="off" aria-label="Kod poklon kartice" data-testid="my-wallet-code" />
        <app-button type="submit" size="s" [loading]="saving()" data-testid="my-wallet-redeem">Iskoristi</app-button>
      </form>
      @if (wallet()?.entries?.length) {
        <div class="flex flex-col text-sm">
          @for (e of wallet()!.entries.slice(0, 5); track e.id) {
            <div class="flex justify-between gap-3 py-1.5 border-t border-[var(--color-border)]">
              <span>{{ labels[e.kind] }} <span class="muted">· {{ e.created_at | srDate }}</span></span>
              <span class="font-semibold">{{ e.amount > 0 ? '+' : '' }}{{ e.amount | rsd }}</span>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class MyWalletComponent implements OnInit {
  private walletService = inject(WalletService);
  private toast = inject(ToastService);

  readonly labels = WALLET_KIND_LABELS;
  readonly wallet = signal<Wallet | null>(null);
  readonly saving = signal(false);
  readonly code = new FormControl('', { nonNullable: true });

  ngOnInit(): void {
    this.walletService.mine().subscribe({ next: (w) => this.wallet.set(w), error: () => undefined });
  }

  redeem(): void {
    const code = this.code.value.trim();
    if (!code) return;
    this.saving.set(true);
    this.walletService.redeemMine(code).subscribe({
      next: (w) => {
        this.saving.set(false);
        this.wallet.set(w);
        this.code.reset('');
        this.toast.success('Poklon kartica je dodata na tvoje stanje.');
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(apiErrorMessage(err, 'Kod nije prihvaćen.'));
      },
    });
  }
}
