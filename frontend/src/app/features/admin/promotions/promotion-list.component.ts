import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PROMOTION_TYPES, Promotion, PromotionPayload, PromotionType } from '../../../core/models/promotion.model';
import { SalonService } from '../../../core/models/service.model';
import { WEEKDAYS } from '../../../core/models/staff.model';
import { ConfirmService } from '../../../core/services/confirm.service';
import { PromotionService } from '../../../core/services/promotion.service';
import { ServiceCatalogService } from '../../../core/services/service-catalog.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { PROMO_PRESETS, PromoPreset, nextPresetRange } from '../../../core/utils/promo-presets';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { RowAction, RowActionsComponent } from '../../../shared/components/row-actions/row-actions.component';
import { ToggleComponent } from '../../../shared/components/toggle/toggle.component';
import { ButtonDirective } from '../../../shared/directives/button.directive';
import { IconDirective, IconName } from '../../../shared/directives/icon.directive';
import { InputDirective } from '../../../shared/directives/input.directive';
import { RsdPipe } from '../../../shared/pipes/rsd.pipe';
import { SrDatePipe } from '../../../shared/pipes/sr-date.pipe';

const TYPE_ICONS: Record<PromotionType, IconName> = {
  discount_percent: 'percent',
  discount_amount: 'coins',
  package: 'gift',
  bundle: 'plus',
  loyalty: 'award',
};

@Component({
  selector: 'app-promotion-list',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, ButtonDirective, ErrorMessageComponent, IconDirective, InputDirective, ModalComponent, RowActionsComponent, RsdPipe, SrDatePipe, ToggleComponent],
  templateUrl: './promotion-list.component.html',
})
export class PromotionListComponent {
  private fb = inject(FormBuilder);
  private promotionService = inject(PromotionService);
  private catalog = inject(ServiceCatalogService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  private rsd = new RsdPipe();

  readonly types = PROMOTION_TYPES;
  readonly weekdays = WEEKDAYS;
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly promotions = signal<Promotion[]>([]);
  readonly services = signal<SalonService[]>([]);

  readonly editing = signal<Promotion | null>(null);
  readonly modalOpen = signal(false);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly selectedServices = signal<Set<number>>(new Set());
  readonly selectedDays = signal<Set<number>>(new Set());

  readonly form = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
    code: this.fb.control<string | null>(null),
    max_uses: this.fb.control<number | null>(null),
    once_per_client: this.fb.nonNullable.control(false),
    type: this.fb.nonNullable.control<PromotionType>('discount_percent'),
    description: this.fb.control<string | null>(null),
    discount_percent: this.fb.control<number | null>(null),
    discount_amount: this.fb.control<number | null>(null),
    package_price: this.fb.control<number | null>(null),
    buy_quantity: this.fb.control<number | null>(2),
    free_quantity: this.fb.control<number | null>(1),
    loyalty_visits: this.fb.control<number | null>(10),
    starts_on: this.fb.control<string | null>(null),
    ends_on: this.fb.control<string | null>(null),
    active: this.fb.nonNullable.control(true),
  });

  readonly type = toSignal(this.form.controls.type.valueChanges, { initialValue: this.form.controls.type.value });
  readonly typeHint = computed(() => PROMOTION_TYPES.find((t) => t.value === this.type())?.hint ?? '');
  readonly packageRegularPrice = computed(() =>
    this.services()
      .filter((s) => this.selectedServices().has(s.id))
      .reduce((sum, s) => sum + s.price, 0),
  );

  readonly presets = PROMO_PRESETS;

  readonly rowActions: RowAction[] = [
    { id: 'edit', label: 'Izmeni', icon: 'edit' },
    { id: 'copy', label: 'Napravi kopiju (npr. drugi %)', icon: 'copy' },
    { id: 'toggle', label: 'Uključi / isključi', icon: 'rotate-ccw' },
    { id: 'delete', label: 'Obriši', icon: 'trash', danger: true },
  ];

  constructor() {
    this.load();
    this.catalog.list().subscribe((services) => this.services.set(services.filter((s) => s.active)));
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.promotionService.list().subscribe({
      next: (list) => {
        this.promotions.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'Učitavanje akcija nije uspelo.'));
        this.loading.set(false);
      },
    });
  }

  icon(type: PromotionType): IconName {
    return TYPE_ICONS[type];
  }

  typeLabel(type: PromotionType): string {
    return PROMOTION_TYPES.find((t) => t.value === type)?.label ?? type;
  }

  summary(p: Promotion): string {
    switch (p.type) {
      case 'discount_percent':
        return `−${p.discount_percent}%`;
      case 'discount_amount':
        return `−${this.rsd.transform(p.discount_amount)}`;
      case 'package':
        return `${this.rsd.transform(p.package_price)} umesto ${this.rsd.transform(p.services.reduce((s, x) => s + x.price, 0))}`;
      case 'bundle':
        return `${p.buy_quantity} + ${p.free_quantity} gratis`;
      case 'loyalty':
        return p.discount_percent === 100 ? `svaka ${p.loyalty_visits}. poseta gratis` : `svaka ${p.loyalty_visits}. poseta −${p.discount_percent}%`;
    }
  }

  scope(p: Promotion): string {
    return p.services.length ? p.services.map((s) => s.name).join(', ') : 'Sve usluge';
  }

  days(p: Promotion): string {
    if (!p.weekdays?.length) return '';
    return p.weekdays.map((d) => WEEKDAYS.find((w) => w.value === d)?.label.slice(0, 3)).join(', ');
  }

  onAction(promotion: Promotion, action: string): void {
    if (action === 'edit') this.openForm(promotion);
    if (action === 'copy') this.openForm({ ...promotion, name: `${promotion.name} (kopija)`, code: null }, true);
    if (action === 'toggle') this.persist(promotion, { ...this.payloadFrom(promotion), active: !promotion.active });
    if (action === 'delete') this.remove(promotion);
  }

  applyPreset(preset: PromoPreset): void {
    const range = nextPresetRange(preset);
    this.form.patchValue({
      name: preset.name,
      code: preset.code,
      type: 'discount_percent',
      discount_percent: preset.percent,
      description: preset.description,
      once_per_client: preset.oncePerClient,
      starts_on: range?.[0] ?? null,
      ends_on: range?.[1] ?? null,
    });
  }

  upperCode(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.form.controls.code.setValue(input.value.toUpperCase().replace(/\s+/g, ''));
  }

  openForm(promotion: Promotion | null = null, asCopy = false): void {
    this.editing.set(asCopy ? null : promotion);
    this.formError.set(null);
    this.form.reset({
      name: promotion?.name ?? '',
      code: promotion?.code ?? null,
      max_uses: promotion?.max_uses ?? null,
      once_per_client: promotion?.once_per_client ?? false,
      type: promotion?.type ?? 'discount_percent',
      description: promotion?.description ?? null,
      discount_percent: promotion?.discount_percent ?? null,
      discount_amount: promotion?.discount_amount ?? null,
      package_price: promotion?.package_price ?? null,
      buy_quantity: promotion?.buy_quantity ?? 2,
      free_quantity: promotion?.free_quantity ?? 1,
      loyalty_visits: promotion?.loyalty_visits ?? 10,
      starts_on: promotion?.starts_on ?? null,
      ends_on: promotion?.ends_on ?? null,
      active: promotion?.active ?? true,
    });
    this.selectedServices.set(new Set(promotion?.services.map((s) => s.id) ?? []));
    this.selectedDays.set(new Set(promotion?.weekdays ?? []));
    this.modalOpen.set(true);
  }

  toggleService(id: number): void {
    this.selectedServices.update((set) => toggled(set, id));
  }

  toggleDay(day: number): void {
    this.selectedDays.update((set) => toggled(set, day));
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Unesi naziv akcije.');
      return;
    }

    const value = this.form.getRawValue();
    const payload: PromotionPayload = {
      ...value,
      description: value.description?.trim() || null,
      code: value.code?.trim() || null,
      max_uses: value.max_uses || null,
      starts_on: value.starts_on || null,
      ends_on: value.ends_on || null,
      weekdays: this.selectedDays().size ? [...this.selectedDays()].sort() : null,
      service_ids: [...this.selectedServices()],
    };

    this.persist(this.editing(), payload);
  }

  private persist(promotion: Promotion | null, payload: PromotionPayload): void {
    this.saving.set(true);
    this.formError.set(null);
    (promotion ? this.promotionService.update(promotion.id, payload) : this.promotionService.create(payload)).subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success('Akcija je sačuvana.');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        const message = apiErrorMessage(err, 'Čuvanje nije uspelo.');
        if (this.modalOpen()) this.formError.set(message);
        else this.toast.error(message);
      },
    });
  }

  private payloadFrom(p: Promotion): PromotionPayload {
    const { id, services, uses, ...rest } = p;
    return { ...rest, service_ids: services.map((s) => s.id) };
  }

  private async remove(promotion: Promotion): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Brisanje akcije',
      message: `Obrisati akciju „${promotion.name}"?`,
      confirmLabel: 'Obriši',
    });
    if (!ok) return;

    this.promotionService.delete(promotion.id).subscribe({
      next: () => {
        this.toast.success('Akcija je obrisana.');
        this.load();
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Brisanje nije uspelo.')),
    });
  }
}

function toggled(set: Set<number>, value: number): Set<number> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}
