import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Appointment } from '../../core/models/appointment.model';
import { ReviewService } from '../../core/services/review.service';
import { ToastService } from '../../core/services/toast.service';
import { apiErrorMessage } from '../../core/utils/api-error';
import { longDate } from '../../core/utils/dates';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { StarInputComponent } from '../../shared/components/star-input/star-input.component';
import { InputDirective } from '../../shared/directives/input.directive';

@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, ErrorMessageComponent, InputDirective, ModalComponent, StarInputComponent],
  template: `
    <app-modal title="Kako je bilo?" footerMode="custom" (cancelled)="closed.emit()" testId="review-modal">
      <p class="text-sm muted mb-3">{{ services() }} · {{ day() }}{{ appointment().staff_member ? ' · ' + appointment().staff_member?.first_name : '' }}</p>
      <app-error-message [message]="error()" />
      <div class="field">
        <span class="text-sm font-semibold">Ocena <span class="required-mark">*</span></span>
        <app-star-input [control]="rating" />
      </div>
      <div class="field">
        <label for="review-comment">Komentar</label>
        <textarea id="review-comment" appInput size="m" rows="4" maxlength="1000" [formControl]="comment" placeholder="Šta ti se dopalo, šta bismo mogli bolje?" data-testid="review-comment"></textarea>
        <span class="text-xs muted">Ime se prikazuje skraćeno (npr. Petar P.).</span>
      </div>
      <app-button modal-footer size="s" [loading]="saving()" (click)="save()" data-testid="review-save">Pošalji ocenu</app-button>
    </app-modal>
  `,
})
export class ReviewFormComponent implements OnInit {
  private reviews = inject(ReviewService);
  private toast = inject(ToastService);

  readonly appointment = input.required<Appointment>();
  readonly saved = output<void>();
  readonly closed = output<void>();

  readonly rating = new FormControl<number | null>(null, Validators.required);
  readonly comment = new FormControl<string | null>(null);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const review = this.appointment().review;
    this.rating.setValue(review?.rating ?? null);
    this.comment.setValue(review?.comment ?? null);
  }

  services(): string {
    return this.appointment().items.map((i) => i.name).join(' + ');
  }

  day(): string {
    return longDate(this.appointment().starts_at);
  }

  save(): void {
    if (!this.rating.value) {
      this.error.set('Izaberi ocenu od 1 do 5 zvezdica.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.reviews.submit(this.appointment().id, this.rating.value, this.comment.value?.trim() || null).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Hvala na oceni!');
        this.saved.emit();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(err, 'Slanje ocene nije uspelo.'));
      },
    });
  }
}
