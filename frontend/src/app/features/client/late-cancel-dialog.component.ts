import { Component, computed, input, output } from '@angular/core';
import { CancellationPreview } from '../../core/models/cancellation-fee.model';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { RsdPipe } from '../../shared/pipes/rsd.pipe';

@Component({
  selector: 'app-late-cancel-dialog',
  standalone: true,
  imports: [ModalComponent, RsdPipe],
  template: `
    <app-modal
      title="Kasno otkazivanje"
      confirmLabel="Ipak otkaži"
      cancelLabel="Zadrži termin"
      confirmIcon="close"
      cancelIcon="check"
      [danger]="true"
      (confirmed)="confirmed.emit()"
      (cancelled)="closed.emit()"
      testId="late-cancel-modal"
    >
      <p class="text-sm mb-3">{{ summary() }} Rok za otkazivanje bez posledica je {{ preview().deadline_label }}.</p>

      @if (preview().free) {
        @if (preview().free_left_after === null) {
          <div class="rounded-lg p-3 mb-3 text-sm" style="background: var(--color-info-tint); color: var(--color-info)" data-testid="late-cancel-exempt">
            Ovo otkazivanje ti se ne naplaćuje.
          </div>
        } @else {
          <div class="rounded-lg p-3 mb-3" style="background: var(--color-warning-tint); color: var(--color-warning)" data-testid="late-cancel-countdown">
            <div class="flex gap-1.5 mb-2" aria-hidden="true">
              @for (dot of dots(); track $index) {
                <span class="inline-block w-3.5 h-3.5 rounded-full border-2" [style.border-color]="'currentColor'" [style.background]="dot ? 'currentColor' : 'transparent'"></span>
              }
            </div>
            <div class="font-semibold">{{ countdownText() }}</div>
            @if (preview().next_amount) {
              <div class="text-sm mt-1">Posle toga se svako kasno otkazivanje naplaćuje — za ovaj termin to bi bilo {{ preview().next_amount! | rsd }}.</div>
            }
          </div>
        }
      } @else {
        <div class="rounded-lg p-3 mb-3" style="background: var(--color-danger-tint); color: var(--color-danger)" data-testid="late-cancel-fee">
          <div class="font-semibold">Naknada za otkazivanje: {{ preview().amount! | rsd }}</div>
          <div class="text-sm mt-1">Iskoristio/la si sva otkazivanja bez naplate. Naknada se plaća pri sledećem dolasku.</div>
        </div>
      }

      <p class="text-sm muted">{{ preview().note }}</p>
    </app-modal>
  `,
})
export class LateCancelDialogComponent {
  readonly preview = input.required<CancellationPreview>();
  readonly summary = input('');
  readonly confirmed = output<void>();
  readonly closed = output<void>();

  readonly dots = computed(() => {
    const total = this.preview().free_total ?? 0;
    const used = this.preview().number ?? 0;
    return Array.from({ length: total }, (_, i) => i < used);
  });

  readonly countdownText = computed(() => {
    const left = this.preview().free_left_after ?? 0;
    if (left === 0) return 'Ovo je tvoje poslednje kasno otkazivanje bez naplate.';
    if (left === 1) return 'Posle ovog ostaje ti još 1 kasno otkazivanje bez naplate.';
    return `Posle ovog ostaje ti još ${left} kasna otkazivanja bez naplate.`;
  });
}
