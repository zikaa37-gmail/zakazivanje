import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Appointment, AppointmentStatus, STATUS_LABELS } from '../../../core/models/appointment.model';
import { ColleagueRef } from '../../../core/models/staff-absence.model';
import { AppointmentService } from '../../../core/services/appointment.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { contactActions, openContact } from '../../../core/utils/contact';
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
    return [...list, ...contactActions(a.client?.phone)];
  }

  async run(a: Appointment, action: string): Promise<boolean> {
    if (openContact(action, a.client?.phone)) return false;

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

  async transfer(a: Appointment, colleague: ColleagueRef): Promise<Appointment | null> {
    const ok = await this.confirm.confirm({
      title: 'Prebacivanje na kolegu',
      message: `Prebaciti termin ${a.client?.first_name} ${a.client?.last_name} (${timeOf(a.starts_at)}) na ${colleague.first_name}? Obaveštenje dobijaju klijent, oba zaposlena i vlasnik, a klijent može da otkaže ili pomeri bez posledica.`,
      confirmLabel: 'Prebaci',
      cancelLabel: 'Ne',
      danger: false,
    });
    if (!ok) return null;

    try {
      const moved = await firstValueFrom(this.appointments.reschedule(a.id, colleague.id, a.starts_at.slice(0, 16)));
      this.toast.success(`Termin je prebačen na ${colleague.first_name}.`);
      return moved;
    } catch (err) {
      this.toast.error(apiErrorMessage(err, 'Prebacivanje nije uspelo.'));
      return null;
    }
  }

  async askClientToReschedule(a: Appointment): Promise<boolean> {
    const ok = await this.confirm.confirm({
      title: 'Zamoli klijenta da pomeri termin',
      message: `${a.client?.first_name} dobija poruku sa linkom da sam izabere novo vreme. Pomeranje i otkazivanje ovog termina su za klijenta bez posledica. Dok ne izabere, termin ostaje gde jeste.`,
      confirmLabel: 'Pošalji',
      cancelLabel: 'Ne',
      danger: false,
    });
    if (!ok) return false;

    try {
      const res = await firstValueFrom(this.appointments.askReschedule(a.id));
      this.toast.success(res.message);
      return true;
    } catch (err) {
      this.toast.error(apiErrorMessage(err, 'Slanje nije uspelo.'));
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
