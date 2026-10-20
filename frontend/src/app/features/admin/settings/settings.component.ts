import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BUSINESS_CATEGORIES, BusinessCategory, BusinessSetting, CONFIRMATION_OPTIONS, ConfirmationMode } from '../../../core/models/business-setting.model';
import { BusinessSettingService } from '../../../core/services/business-setting.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { extractPalette, isHexColor, readableTextOn } from '../../../core/utils/color';
import { resizeImage } from '../../../core/utils/resize-image';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { ButtonDirective } from '../../../shared/directives/button.directive';
import { IconDirective } from '../../../shared/directives/icon.directive';
import { InputDirective } from '../../../shared/directives/input.directive';

type Tab = 'business' | 'look' | 'booking';
type ColorKey = 'theme_primary' | 'theme_secondary' | 'theme_tertiary';

const DEFAULT_COLORS: Record<ColorKey, string> = {
  theme_primary: '#0f766e',
  theme_secondary: '#b45309',
  theme_tertiary: '#7c3aed',
};

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, ButtonDirective, ErrorMessageComponent, IconDirective, InputDirective],
  templateUrl: './settings.component.html',
})
export class SettingsComponent {
  private fb = inject(FormBuilder);
  private business = inject(BusinessSettingService);
  private theme = inject(ThemeService);
  private toast = inject(ToastService);

  readonly categories = BUSINESS_CATEGORIES;
  readonly confirmationOptions = CONFIRMATION_OPTIONS;
  readonly colorFields: { key: ColorKey; label: string; hint: string }[] = [
    { key: 'theme_primary', label: 'Primarna', hint: 'Dugmad, aktivni meni, izabrani termin' },
    { key: 'theme_secondary', label: 'Sekundarna', hint: 'Akcije i popusti, naglašeni iznosi' },
    { key: 'theme_tertiary', label: 'Tercijarna', hint: 'Dodatni akcenti i oznake' },
  ];

  readonly tab = signal<Tab>('business');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly logo = signal<string | null>(null);
  readonly suggested = signal<string[]>([]);
  readonly extracting = signal(false);

  private saved: BusinessSetting | null = null;

  readonly form = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
    category: this.fb.nonNullable.control<BusinessCategory>('other'),
    description: this.fb.control<string | null>(null),
    address: this.fb.control<string | null>(null),
    city: this.fb.control<string | null>(null),
    phone: this.fb.control<string | null>(null),
    whatsapp_number: this.fb.control<string | null>(null),
    email: this.fb.control<string | null>(null, Validators.email),
    website: this.fb.control<string | null>(null),
    instagram: this.fb.control<string | null>(null),
    pib: this.fb.control<string | null>(null),
    registration_number: this.fb.control<string | null>(null),
    theme_primary: this.fb.nonNullable.control(DEFAULT_COLORS.theme_primary),
    theme_secondary: this.fb.nonNullable.control(DEFAULT_COLORS.theme_secondary),
    theme_tertiary: this.fb.nonNullable.control(DEFAULT_COLORS.theme_tertiary),
    booking_confirmation: this.fb.nonNullable.control<ConfirmationMode>('manual'),
  });

  constructor() {
    this.business.load().subscribe({
      next: (settings) => {
        this.fill(settings);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'Učitavanje podešavanja nije uspelo.'));
        this.loading.set(false);
      },
    });

    for (const key of Object.keys(DEFAULT_COLORS) as ColorKey[]) {
      this.form.controls[key].valueChanges.subscribe(() => this.preview());
    }

    inject(DestroyRef).onDestroy(() => {
      if (this.saved) this.applyColors(this.saved.theme_primary, this.saved.theme_secondary, this.saved.theme_tertiary);
    });
  }

  textOn(color: string): string {
    return isHexColor(color) ? readableTextOn(color) : '#ffffff';
  }

  async onLogoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toast.error('Izaberi sliku (PNG, JPG, WEBP ili SVG).');
      return;
    }

    try {
      const data = file.type === 'image/svg+xml' ? await readAsDataUrl(file) : (await resizeImage(file, 512)).data;
      this.logo.set(data);
      await this.suggestColors(data, true);
    } catch {
      this.toast.error('Slika ne može da se učita.');
    }
  }

  removeLogo(): void {
    this.logo.set(null);
    this.suggested.set([]);
  }

  async suggestColors(source = this.logo(), apply = false): Promise<void> {
    if (!source) return;
    this.extracting.set(true);
    try {
      const palette = await extractPalette(source, 3);
      this.suggested.set(palette);
      if (apply && palette.length) this.applySuggested();
      if (!palette.length) this.toast.info('Logo nema dovoljno izraženih boja — izaberi ih ručno.');
    } finally {
      this.extracting.set(false);
    }
  }

  applySuggested(): void {
    const [primary, secondary, tertiary] = this.suggested();
    this.form.patchValue({
      theme_primary: primary ?? this.form.controls.theme_primary.value,
      theme_secondary: secondary ?? this.form.controls.theme_secondary.value,
      theme_tertiary: tertiary ?? this.form.controls.theme_tertiary.value,
    });
  }

  resetColors(): void {
    this.form.patchValue(DEFAULT_COLORS);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.tab.set('business');
      this.error.set('Proveri naziv i email.');
      return;
    }

    const value = this.form.getRawValue();
    const clean = (v: string | null) => v?.trim() || null;
    const payload: Partial<BusinessSetting> = {
      ...value,
      description: clean(value.description),
      address: clean(value.address),
      city: clean(value.city),
      phone: clean(value.phone),
      whatsapp_number: clean(value.whatsapp_number),
      email: clean(value.email),
      website: clean(value.website),
      instagram: clean(value.instagram),
      pib: clean(value.pib),
      registration_number: clean(value.registration_number),
      logo: this.logo(),
    };

    this.saving.set(true);
    this.error.set(null);
    this.business.update(payload).subscribe({
      next: (settings) => {
        this.saving.set(false);
        this.saved = settings;
        this.toast.success('Podešavanja su sačuvana.');
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(err, 'Čuvanje nije uspelo.'));
      },
    });
  }

  private fill(settings: BusinessSetting): void {
    this.saved = settings;
    this.logo.set(settings.logo);
    this.form.reset({
      name: settings.name,
      category: settings.category,
      description: settings.description,
      address: settings.address,
      city: settings.city,
      phone: settings.phone,
      whatsapp_number: settings.whatsapp_number,
      email: settings.email,
      website: settings.website,
      instagram: settings.instagram,
      pib: settings.pib,
      registration_number: settings.registration_number,
      theme_primary: settings.theme_primary ?? DEFAULT_COLORS.theme_primary,
      theme_secondary: settings.theme_secondary ?? DEFAULT_COLORS.theme_secondary,
      theme_tertiary: settings.theme_tertiary ?? DEFAULT_COLORS.theme_tertiary,
      booking_confirmation: settings.booking_confirmation,
    });
  }

  private preview(): void {
    const { theme_primary, theme_secondary, theme_tertiary } = this.form.getRawValue();
    this.applyColors(theme_primary, theme_secondary, theme_tertiary);
  }

  private applyColors(primary: string | null, secondary: string | null, tertiary: string | null): void {
    this.theme.applyBrand({ primary, secondary, tertiary });
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
