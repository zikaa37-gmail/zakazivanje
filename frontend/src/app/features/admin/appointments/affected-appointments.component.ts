import { Component, inject, input, output } from '@angular/core';
import { AffectedAppointment, ColleagueRef } from '../../../core/models/staff-absence.model';
import { contactHref } from '../../../core/utils/contact';
import { longDate, timeOf } from '../../../core/utils/dates';
import { ButtonDirective } from '../../../shared/directives/button.directive';
import { IconDirective } from '../../../shared/directives/icon.directive';
import { ClientNamePipe } from '../../../shared/pipes/client-name.pipe';
import { AppointmentActionsService } from './appointment-actions.service';

@Component({
  selector: 'app-affected-appointments',
  standalone: true,
  imports: [ButtonDirective, ClientNamePipe, IconDirective],
  template: `
    <div class="flex flex-col gap-2" data-testid="absence-affected">
      @for (t of appointments(); track t.id) {
        <div class="rounded-lg border border-[var(--color-border)] p-3 flex flex-col gap-2" [attr.data-testid]="'affected-' + t.id">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <div class="font-semibold">{{ when(t) }}</div>
              <div class="text-sm">{{ t.client | clientName }} · <span class="muted">{{ services(t) }}</span></div>
            </div>
            @if (t.free_change_reason === 'salon_request') {
              <span class="badge badge-info">Poslato klijentu</span>
            }
          </div>
          @if (t.client?.phone) {
            <div class="flex flex-wrap gap-3 text-sm">
              @if (href('call', t)) {
                <a [href]="href('call', t)" class="flex items-center gap-1 font-semibold" [attr.data-testid]="'affected-call-' + t.id"><span appIcon="phone" aria-hidden="true"></span>{{ t.client?.phone }}</a>
              } @else {
                <span class="flex items-center gap-1"><span appIcon="phone" aria-hidden="true"></span>{{ t.client?.phone }}</span>
              }
              @if (href('whatsapp', t)) {
                <a [href]="href('whatsapp', t)" target="_blank" rel="noopener" class="flex items-center gap-1"><span appIcon="send" aria-hidden="true"></span>WhatsApp</a>
              }
              @if (href('viber', t)) {
                <a [href]="href('viber', t)" class="flex items-center gap-1"><span appIcon="message-square" aria-hidden="true"></span>Viber</a>
              }
            </div>
          }
          <div class="flex flex-wrap items-center gap-2">
            @for (c of t.alternatives; track c.id) {
              <button type="button" appBtn theme="secondary" size="s" (click)="transfer(t, c)" [attr.data-testid]="'affected-transfer-' + t.id + '-' + c.id">
                <span class="color-dot" [style.background]="c.color || 'var(--color-primary)'"></span> Prebaci: {{ c.first_name }}
              </button>
            } @empty {
              <span class="text-xs muted">Niko od kolega nije slobodan u to vreme.</span>
            }
            <button type="button" appBtn theme="secondary" size="s" (click)="ask(t)" [attr.data-testid]="'affected-ask-' + t.id"><span appIcon="send" aria-hidden="true"></span> Pošalji da sam pomeri</button>
            <button type="button" appBtn theme="ghost" size="s" class="text-[var(--color-danger)]" (click)="cancel(t)" [attr.data-testid]="'affected-cancel-' + t.id">Otkaži</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class AffectedAppointmentsComponent {
  private actions = inject(AppointmentActionsService);

  readonly appointments = input.required<AffectedAppointment[]>();
  readonly changed = output<void>();

  async transfer(t: AffectedAppointment, colleague: ColleagueRef): Promise<void> {
    if (await this.actions.transfer(t, colleague)) this.changed.emit();
  }

  async ask(t: AffectedAppointment): Promise<void> {
    if (await this.actions.askClientToReschedule(t)) this.changed.emit();
  }

  async cancel(t: AffectedAppointment): Promise<void> {
    if (await this.actions.run(t, 'cancel')) this.changed.emit();
  }

  when(t: AffectedAppointment): string {
    return `${longDate(t.starts_at)} · ${timeOf(t.starts_at)}`;
  }

  services(t: AffectedAppointment): string {
    return t.items.map((i) => i.name).join(' + ');
  }

  href(channel: 'call' | 'whatsapp' | 'viber', t: AffectedAppointment): string | null {
    return contactHref(channel, t.client?.phone);
  }
}
