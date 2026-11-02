import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BUSINESS_CATEGORIES, BusinessCategory } from '../../../core/models/business-setting.model';
import { AUDIENCE_OPTIONS, CategoryProposal, ServiceAudience } from '../../../core/models/service.model';
import { StaffMember } from '../../../core/models/staff.model';
import { AiService } from '../../../core/services/ai.service';
import { BusinessSettingService } from '../../../core/services/business-setting.service';
import { ServiceCategoryService } from '../../../core/services/service-category.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { SERVICE_PRESETS } from '../../../core/utils/service-presets';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { IconDirective } from '../../../shared/directives/icon.directive';
import { InputDirective } from '../../../shared/directives/input.directive';

type Source = 'preset' | 'ai';

interface ServiceRow {
  selected: FormControl<boolean>;
  name: FormControl<string>;
  description: string | null;
  duration: FormControl<number>;
  price: FormControl<number | null>;
  audience: FormControl<ServiceAudience>;
}

interface CategoryRow {
  selected: FormControl<boolean>;
  name: FormControl<string>;
  services: ServiceRow[];
}

@Component({
  selector: 'app-service-suggestions',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, ErrorMessageComponent, IconDirective, InputDirective, ModalComponent],
  templateUrl: './service-suggestions.component.html',
})
export class ServiceSuggestionsComponent {
  private ai = inject(AiService);
  private categories = inject(ServiceCategoryService);
  private business = inject(BusinessSettingService);
  private toast = inject(ToastService);

  readonly staff = input.required<StaffMember[]>();
  readonly applied = output<void>();
  readonly cancelled = output<void>();

  readonly businessCategories = BUSINESS_CATEGORIES;
  readonly audiences = AUDIENCE_OPTIONS;
  readonly source = signal<Source>('ai');
  readonly preset = new FormControl<BusinessCategory>(this.business.settings()?.category ?? 'other', { nonNullable: true });
  readonly description = new FormControl('', { nonNullable: true });
  readonly rows = signal<CategoryRow[]>([]);
  readonly thinking = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly selectedStaff = signal<Set<number> | null>(null);
  readonly staffSelection = computed(() => this.selectedStaff() ?? new Set(this.staff().filter((s) => s.active).map((s) => s.id)));

  constructor() {
    this.preset.valueChanges.subscribe(() => this.loadPreset());
  }

  setSource(source: Source): void {
    this.source.set(source);
    this.error.set(null);
    if (source === 'preset') this.loadPreset();
    else this.rows.set([]);
  }

  loadPreset(): void {
    this.rows.set(SERVICE_PRESETS[this.preset.value].map((c) => this.toRow(c)));
  }

  suggest(): void {
    this.thinking.set(true);
    this.error.set(null);
    this.ai.serviceSuggestions(this.description.value.trim() || null).subscribe({
      next: ({ categories }) => {
        this.thinking.set(false);
        this.rows.set(categories.map((c) => this.toRow(c)));
        if (categories.length === 0) this.error.set('AI nije predložio nijednu uslugu. Probaj detaljniji opis.');
      },
      error: (err) => {
        this.thinking.set(false);
        this.error.set(apiErrorMessage(err, 'AI predlog nije uspeo.'));
      },
    });
  }

  toggleStaff(id: number): void {
    const next = new Set(this.staffSelection());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedStaff.set(next);
  }

  selectedCount(): number {
    return this.rows().reduce((sum, c) => sum + (c.selected.value ? c.services.filter((s) => s.selected.value).length : 0), 0);
  }

  missingPrices(): number {
    return this.rows().reduce((sum, c) => sum + (c.selected.value ? c.services.filter((s) => s.selected.value && !s.price.value).length : 0), 0);
  }

  apply(): void {
    const payload: CategoryProposal[] = this.rows()
      .filter((c) => c.selected.value && c.name.value.trim())
      .map((c) => ({
        name: c.name.value.trim(),
        services: c.services
          .filter((s) => s.selected.value && s.name.value.trim())
          .map((s) => ({
            name: s.name.value.trim(),
            description: s.description,
            duration_minutes: Number(s.duration.value) || 30,
            price: s.price.value ? Number(s.price.value) : null,
            audience: s.audience.value,
          })),
      }));
    if (payload.length === 0) {
      this.error.set('Izaberi bar jednu kategoriju.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.categories.apply(payload, [...this.staffSelection()]).subscribe({
      next: (result) => {
        this.saving.set(false);
        const skipped = result.services_skipped ? `, ${result.services_skipped} već postoji` : '';
        this.toast.success(`Dodato: ${result.categories_created} kategorija i ${result.services_created} usluga${skipped}.`);
        this.applied.emit();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(err, 'Dodavanje nije uspelo.'));
      },
    });
  }

  private toRow(category: CategoryProposal): CategoryRow {
    return {
      selected: new FormControl(true, { nonNullable: true }),
      name: new FormControl(category.name, { nonNullable: true }),
      services: category.services.map((s) => ({
        selected: new FormControl(true, { nonNullable: true }),
        name: new FormControl(s.name, { nonNullable: true }),
        description: s.description ?? null,
        duration: new FormControl(s.duration_minutes, { nonNullable: true }),
        price: new FormControl(s.price),
        audience: new FormControl(s.audience, { nonNullable: true }),
      })),
    };
  }
}
