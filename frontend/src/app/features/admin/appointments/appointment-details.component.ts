import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Appointment, STATUS_LABELS } from '../../../core/models/appointment.model';
import { StaffMember } from '../../../core/models/staff.model';
import { longDate, timeOf } from '../../../core/utils/dates';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { TimePickerComponent } from '../../../shared/components/time-picker/time-picker.component';
import { ButtonDirective } from '../../../shared/directives/button.directive';
import { IconDirective } from '../../../shared/directives/icon.directive';
import { InputDirective } from '../../../shared/directives/input.directive';
import { RsdPipe } from '../../../shared/pipes/rsd.pipe';
import { AppointmentActionsService } from './appointment-actions.service';

@Component({
  selector: 'app-appointment-details',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, ButtonDirective, IconDirective, InputDirective, ModalComponent, RsdPipe, TimePickerComponent],
  templateUrl: './appointment-details.component.html',
})
export class AppointmentDetailsComponent implements OnInit {
  readonly appointment = input.required<Appointment>();
  readonly staff = input<StaffMember[]>([]);
  readonly changed = output<void>();
  readonly closed = output<void>();

  private actionsService = inject(AppointmentActionsService);

  readonly statuses = STATUS_LABELS;
  readonly moving = signal(false);
  readonly saving = signal(false);
  readonly moveStaff = new FormControl<number | null>(null);
  readonly moveDate = new FormControl<string>('', { nonNullable: true });
  readonly moveTime = new FormControl<string | null>(null);

  readonly active = computed(() => ['pending', 'confirmed'].includes(this.appointment().status));
  readonly when = computed(() => `${longDate(this.appointment().starts_at)} · ${timeOf(this.appointment().starts_at)} – ${timeOf(this.appointment().ends_at)}`);
  readonly eligibleStaff = computed(() => {
    const ids = this.appointment().items.map((i) => i.service_id).filter((id): id is number => id !== null);
    return this.staff().filter((m) => m.active && ids.every((id) => m.services.some((s) => s.id === id)));
  });
  readonly phoneHref = computed(() => {
    const phone = this.appointment().client?.phone;
    return phone ? `tel:${phone.replace(/\s/g, '')}` : null;
  });

  ngOnInit(): void {
    const a = this.appointment();
    this.moveStaff.setValue(a.staff_member_id);
    this.moveDate.setValue(a.starts_at.slice(0, 10));
    this.moveTime.setValue(timeOf(a.starts_at));
  }

  async act(action: string): Promise<void> {
    if (await this.actionsService.run(this.appointment(), action)) this.changed.emit();
  }

  async move(): Promise<void> {
    const staffId = this.moveStaff.value;
    if (!staffId || !this.moveDate.value || !this.moveTime.value) return;
    this.saving.set(true);
    const moved = await this.actionsService.reschedule(this.appointment(), staffId, `${this.moveDate.value} ${this.moveTime.value}`, false);
    this.saving.set(false);
    if (moved) this.changed.emit();
  }
}
