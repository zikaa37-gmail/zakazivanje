import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { PaymentDetails } from '../../../core/models/payment.model';
import { PaymentService } from '../../../core/services/payment.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { ButtonDirective } from '../../directives/button.directive';
import { IconDirective } from '../../directives/icon.directive';
import { RsdPipe } from '../../pipes/rsd.pipe';
import { SrDateTimePipe } from '../../pipes/sr-date-time.pipe';
import { ErrorMessageComponent } from '../error-message/error-message.component';
import { ModalComponent } from '../modal/modal.component';

@Component({
  selector: 'app-payment-dialog',
  standalone: true,
  imports: [ButtonDirective, ErrorMessageComponent, IconDirective, ModalComponent, RsdPipe, SrDateTimePipe],
  templateUrl: './payment-dialog.component.html',
  styleUrl: './payment-dialog.component.scss',
})
export class PaymentDialogComponent implements OnInit {
  private payments = inject(PaymentService);
  private toast = inject(ToastService);

  readonly appointmentId = input.required<number>();
  readonly asClient = input(false);
  readonly closed = output<void>();

  readonly details = signal<PaymentDetails | null>(null);
  readonly error = signal<string | null>(null);
  readonly downloading = signal(false);

  ngOnInit(): void {
    this.payments.details(this.appointmentId(), this.asClient()).subscribe({
      next: (details) => this.details.set(details),
      error: (err) => this.error.set(apiErrorMessage(err, 'Podaci za uplatu nisu dostupni.')),
    });
  }

  async copy(value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      this.toast.success('Kopirano.');
    } catch {
      this.toast.error('Kopiranje nije uspelo.');
    }
  }

  async slip(): Promise<void> {
    this.downloading.set(true);
    try {
      await this.payments.openSlip(this.appointmentId(), this.asClient());
    } catch (err) {
      this.toast.error(apiErrorMessage(err, 'Uplatnica nije preuzeta.'));
    }
    this.downloading.set(false);
  }
}
