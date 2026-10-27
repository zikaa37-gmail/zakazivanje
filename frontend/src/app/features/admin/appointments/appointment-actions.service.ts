import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Appointment, AppointmentStatus, STATUS_LABELS } from '../../../core/models/appointment.model';
import { AppointmentService } from '../../../core/services/appointment.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { timeOf } from '../../../core/utils/dates';
import { RowAction } from '../../../shared/components/row-actions/row-actions.component';

@Injectable({ providedIn: 'root' })
export class AppointmentActionsService {
  private appointments = inject(AppointmentService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);

  actions(a: Appointment): RowAction[] {
    const list: RowAction[] = [];
    if (a.status === 'pending') list.push({ id: 'confirmed', label: 'Potvrdi', icon: 'check' });
    if (a.status === 'pending' || a.status === 'confirmed') {
      list.push({ id: 'completed', label: 'Završen', icon: 'check-square' });
      list.push({ id: 'no_show', label: 'Nije došao', icon: 'alert-triangle' });
      list.push({ id: 'cancel', label: 'Otkaži', icon: 'close', danger: true });
      list.push({ id: 'cancel-by-client', label: 'Klijent otkazao', icon: 'close', danger: true });
      if (a.recurrence?.active) list.push({ id: 'cancel-series', label: 'Otkaži ovaj i sve sledeće', icon: 'close', danger: true });
    } else {
      list.push({ id: 'confirmed', label: 'Vrati na potvrđen', icon: 'rotate-ccw' });
    }
    if (a.client?.phone) list.push({ id: 'call', label: 'Pozovi klijenta', icon: 'phone' });
    return list;
  }

  async run(a: Appointment, action: string): Promise<boolean> {
    if (action === 'call') {
      window.location.href = `tel:${a.client!.phone!.replace(/\s/g, '')}`;
      return false;
    }

    try {
      if (action === 'cancel' || action === 'cancel-series' || action === 'cancel-by-client') {
        const series = action === 'cancel-series';
        const byClient = action === 'cancel-by-client';
        const ok = await this.confirm.confirm({
          title: series ? 'Otkazivanje niza' : byClient ? 'Klijent je otkazao' : 'Otkazivanje termina',
          message: series
            ? `Otkazati ovaj i sve sledeće termine za ${a.client?.first_name} ${a.client?.last_name}? Ponavljanje se zaustavlja.`
            : byClient
              ? `Otkazati termin ${a.client?.first_name} ${a.client?.last_name} (${timeOf(a.starts_at)}) na zahtev klijenta? Računa se kao otkazivanje klijenta.`
              : `Otkazati termin ${a.client?.first_name} ${a.client?.last_name} (${timeOf(a.starts_at)})?`,
          confirmLabel: 'Otkaži',
          cancelLabel: 'Ne',
        });
        if (!ok) return false;
        const res = await firstValueFrom(this.appointments.cancel(a.id, series ? 'series' : 'this', byClient));
        this.toast.success(res.message);
        return true;
      }

      await firstValueFrom(this.appointments.setStatus(a.id, action as AppointmentStatus));
      this.toast.success(`Status: ${STATUS_LABELS[action as AppointmentStatus].label}.`);
      return true;
    } catch (err) {
      this.toast.error(apiErrorMessage(err, 'Akcija nije uspela.'));
      return false;
    }
  }

  async reschedule(a: Appointment, staffMemberId: number, startsAt: string, ask = true): Promise<Appointment | null> {
    if (ask) {
      const ok = await this.confirm.confirm({
        title: 'Pomeranje termina',
        message: `Pomeriti termin ${a.client?.first_name} ${a.client?.last_name} na ${startsAt.slice(8, 10)}.${startsAt.slice(5, 7)}. u ${startsAt.slice(11, 16)}? Klijent dobija obaveštenje.`,
        confirmLabel: 'Pomeri',
        cancelLabel: 'Ne',
        danger: false,
      });
      if (!ok) return null;
    }

    try {
      const moved = await firstValueFrom(this.appointments.reschedule(a.id, staffMemberId, startsAt));
      this.toast.success('Termin je pomeren.');
      return moved;
    } catch (err) {
      this.toast.error(apiErrorMessage(err, 'Pomeranje nije uspelo.'));
      return null;
    }
  }
}
