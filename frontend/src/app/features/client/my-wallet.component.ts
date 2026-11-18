import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { GIFT_CARD_STATUS, WALLET_KIND_LABELS, Wallet, formatGiftCode } from '../../core/models/wallet.model';
import { ToastService } from '../../core/services/toast.service';
import { WalletService } from '../../core/services/wallet.service';
import { apiErrorMessage } from '../../core/utils/api-error';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { IconDirective } from '../../shared/directives/icon.directive';
import { InputDirective } from '../../shared/directives/input.directive';
import { RsdPipe } from '../../shared/pipes/rsd.pipe';
import { SrDatePipe } from '../../shared/pipes/sr-date.pipe';

@Component({
  selector: 'app-my-wallet',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, IconDirective, InputDirective, RsdPipe, SrDatePipe],
  template: `
    <div class="card flex flex-col gap-3" data-testid="my-wallet">
      <h2 class="text-base font-semibold">Poklon kartice i stanje</h2>

      @if (cards().length > 0) {
        <div class="flex flex-col gap-2" data-testid="my-gift-cards">
          @for (c of cards(); track c.id) {
            <div class="gift-tile" [class.is-dimmed]="c.status !== 'active'" [attr.data-testid]="'my-gift-card-' + c.id">
              <span appIcon="gift" aria-hidden="true"></span>
              <div class="min-w-0 flex-1">
                <div class="font-mono font-semibold">{{ code(c.code) }}</div>
                <div class="text-xs muted">
                  {{ statusInfo[c.status].label }}{{ c.buyer_name ? ' · od ' + c.buyer_name : '' }}{{ c.expires_on ? ' · važi do ' + (c.expires_on | srDate) : '' }}
                </div>
              </div>
              <div class="text-right">
                <div class="font-bold">{{ c.balance | rsd }}</div>
                <div class="text-xs muted">od {{ c.amount | rsd }}</div>
              </div>
            </div>
          }
        </div>
      }

      @if ((wallet()?.balance ?? 0) > 0) {
        <div class="flex items-center justify-between text-sm" data-testid="my-wallet-balance-row">
          <span>Uplaćeno unapred</span>
          <span class="font-bold" data-testid="my-wallet-balance">{{ wallet()!.balance | rsd }}</span>
        </div>
      }

      <form class="flex flex-col gap-1" (submit)="$event.preventDefault(); claim()">
        <label class="text-sm font-semibold" for="my-gift-code">Imaš poklon karticu?</label>
        <div class="flex gap-2">
          <input id="my-gift-code" appInput size="m" class="flex-1 min-w-0" [formControl]="codeInput" placeholder="Kod sa kartice, npr. AB3K-9QXZ" autocomplete="off" data-testid="my-wallet-code" />
          <app-button type="submit" size="s" [loading]="saving()" data-testid="my-wallet-claim">Dodaj</app-button>
        </div>
        <span class="text-xs muted">Kartica se dodaje na tvoj nalog — vidiš koliko je ostalo i plaćaš njome u „Moji termini“ ili u salonu, ne moraš da je nosiš.</span>
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
  styles: `
    .gift-tile {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      border-radius: var(--radius);
      background: var(--color-primary-tint);
      color: var(--color-text);
    }
  `,
})
export class MyWalletComponent implements OnInit {
  private walletService = inject(WalletService);
  private toast = inject(ToastService);

  readonly labels = WALLET_KIND_LABELS;
  readonly statusInfo = GIFT_CARD_STATUS;
  readonly code = formatGiftCode;
  readonly wallet = signal<Wallet | null>(null);
  readonly cards = computed(() => this.wallet()?.gift_cards ?? []);
  readonly saving = signal(false);
  readonly codeInput = new FormControl('', { nonNullable: true });

  ngOnInit(): void {
    this.walletService.mine().subscribe({ next: (w) => this.wallet.set(w), error: () => undefined });
  }

  claim(): void {
    const code = this.codeInput.value.trim();
    if (!code) return;
    this.saving.set(true);
    this.walletService.claimMine(code).subscribe({
      next: (w) => {
        this.saving.set(false);
        this.wallet.set(w);
        this.codeInput.reset('');
        this.toast.success('Poklon kartica je dodata na tvoj nalog.');
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(apiErrorMessage(err, 'Kod nije prihvaćen.'));
      },
    });
  }
}
