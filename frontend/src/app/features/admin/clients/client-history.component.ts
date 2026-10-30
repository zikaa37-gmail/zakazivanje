import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Client, ClientActivity, ClientHistory, DisciplineZone, ZONES, ZONE_BY_VALUE } from '../../../core/models/client.model';
import { AuthService } from '../../../core/services/auth.service';
import { ClientService } from '../../../core/services/client.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { today } from '../../../core/utils/dates';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ButtonDirective } from '../../../shared/directives/button.directive';
import { InputDirective } from '../../../shared/directives/input.directive';
import { SrDatePipe } from '../../../shared/pipes/sr-date.pipe';
import { SrDateTimePipe } from '../../../shared/pipes/sr-date-time.pipe';

const ACTIVITY_LABELS: Record<string, string> = {
  login: 'Prijava',
  login_failed: 'Neuspela prijava',
  session: 'Otvorio/la aplikaciju',
  availability_viewed: 'Gledao/la slobodne termine',
  booked: 'Zakazao/la termin',
  booking_failed: 'Pokušaj zakazivanja nije uspeo',
  cancelled: 'Otkazivanje termina',
  rescheduled: 'Pomerio/la termin',
  reschedule_failed: 'Pomeranje nije uspelo',
  no_show: 'Nije došao/la',
  waitlist_joined: 'Prijava na listu čekanja',
  zone_changed: 'Promena zone',
};

const REASONS: Record<string, string> = {
  silent_block: 'tiho blokiran — prikazano da je zauzeto',
  yellow_window: 'van dozvoljenog perioda (žuta zona) — prikazano da je zauzeto',
  suspended: 'nalog je suspendovan',
};

@Component({
  selector: 'app-client-history',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, ButtonDirective, ErrorMessageComponent, InputDirective, ModalComponent, SrDatePipe, SrDateTimePipe],
  templateUrl: './client-history.component.html',
})
export class ClientHistoryComponent implements OnInit {
  readonly clientId = input.required<number>();
  readonly closed = output<void>();
  readonly changed = output<Client>();

  private clientService = inject(ClientService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  protected readonly isManager = inject(AuthService).isManager;

  readonly zones = ZONES;
  readonly zoneInfo = ZONE_BY_VALUE;
  readonly minDate = today();
  readonly history = signal<ClientHistory | null>(null);
  readonly logs = signal<ClientActivity[]>([]);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly loadingMore = signal(false);

  readonly client = computed(() => this.history()?.client ?? null);

  readonly zoneForm = this.fb.group({
    zone: this.fb.control<DisciplineZone | 'auto'>('auto'),
    reason: this.fb.control<string | null>(null),
    until: this.fb.control<string | null>(null),
  });

  ngOnInit(): void {
    this.clientService.history(this.clientId()).subscribe({
      next: (history) => {
        this.history.set(history);
        this.logs.set(history.logs);
        this.resetZoneForm(history.client);
      },
      error: (err) => this.error.set(apiErrorMessage(err, 'Istorijat nije učitan.')),
    });
  }

  label(log: ClientActivity): string {
    if (log.type === 'cancelled' && log.data?.['by_salon']) return 'Otkazao/la (javio/la salonu)';
    if (log.type === 'cancelled') return 'Otkazao/la termin';
    return ACTIVITY_LABELS[log.type] ?? log.type;
  }

  tone(log: ClientActivity): string {
    if (['no_show', 'login_failed'].includes(log.type) || log.data?.['reason'] === 'silent_block' || log.data?.['reason'] === 'suspended') return 'badge-danger';
    if (['cancelled', 'booking_failed', 'reschedule_failed', 'zone_changed'].includes(log.type)) return 'badge-warning';
    if (log.type === 'booked') return 'badge-success';
    return 'badge-neutral';
  }

  details(log: ClientActivity): string {
    const d = log.data ?? {};
    const parts: string[] = [];
    const when = (value: unknown) => {
      const text = String(value);
      return `${text.slice(8, 10)}.${text.slice(5, 7)}.${text.length > 10 ? ' ' + text.slice(11, 16) : ''}`;
    };

    if (log.type === 'zone_changed') {
      const to = d['to'] === 'auto' ? 'automatski' : (this.zoneInfo[d['to'] as DisciplineZone]?.label ?? String(d['to']));
      parts.push(`${this.zoneInfo[d['from'] as DisciplineZone]?.label ?? d['from']} → ${to}`);
      parts.push(d['manual'] ? 'ručno' : `automatski, poeni ${d['points']}`);
      if (d['reason']) parts.push(String(d['reason']));
      if (d['until']) parts.push(`do ${when(d['until'])}`);
    } else {
      if (d['starts_at']) parts.push(`termin ${when(d['starts_at'])}`);
      if (d['from'] && d['to']) parts.push(`${when(d['from'])} → ${when(d['to'])}`);
      if (d['date']) parts.push(`dan ${when(d['date'])}`);
      if (typeof d['hours_before'] === 'number') parts.push(`${d['hours_before']} h pre termina`);
      if (d['reason']) parts.push(REASONS[String(d['reason'])] ?? String(d['reason']));
      if (d['zone'] && !d['reason']) parts.push(`zona: ${this.zoneInfo[d['zone'] as DisciplineZone]?.label ?? d['zone']}`);
    }
    if (log.actor) parts.push(`${log.actor.first_name} ${log.actor.last_name}`);

    return parts.join(' · ');
  }

  loadMore(): void {
    const last = this.logs().at(-1);
    if (!last) return;
    this.loadingMore.set(true);
    this.clientService.history(this.clientId(), last.id).subscribe({
      next: (history) => {
        this.logs.update((logs) => [...logs, ...history.logs]);
        this.history.update((h) => (h ? { ...h, has_more: history.has_more } : h));
        this.loadingMore.set(false);
      },
      error: () => this.loadingMore.set(false),
    });
  }

  async saveZone(): Promise<void> {
    const value = this.zoneForm.getRawValue();
    const zone = value.zone === 'auto' ? null : value.zone;
    if (zone === 'red') {
      const ok = await this.confirm.confirm({
        title: 'Suspenzija naloga',
        message: `${this.client()?.first_name} ${this.client()?.last_name} posle prijave vidi da je nalog suspendovan i ne može da zakazuje. Nastaviti?`,
        confirmLabel: 'Suspenduj',
      });
      if (!ok) return;
    }

    this.saving.set(true);
    this.clientService.setZone(this.clientId(), { zone, reason: value.reason?.trim() || null, until: zone ? value.until || null : null }).subscribe({
      next: (client) => {
        this.saving.set(false);
        this.history.update((h) => (h ? { ...h, client } : h));
        this.resetZoneForm(client);
        this.changed.emit(client);
        this.toast.success(zone ? `Zona: ${this.zoneInfo[zone].label}.` : 'Zona se ponovo računa automatski.');
        this.clientService.history(this.clientId()).subscribe((history) => this.logs.set(history.logs));
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(apiErrorMessage(err, 'Promena zone nije uspela.'));
      },
    });
  }

  private resetZoneForm(client: Client): void {
    this.zoneForm.reset({
      zone: client.zone_manual ? client.discipline_zone : 'auto',
      reason: client.zone_manual ? client.zone_reason : null,
      until: client.zone_until,
    });
  }
}
