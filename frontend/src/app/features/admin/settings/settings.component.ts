import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { BUSINESS_CATEGORIES, BusinessCategory, BusinessSetting, CONFIRMATION_OPTIONS, ConfirmationMode } from '../../../core/models/business-setting.model';
import { BusinessSettingService } from '../../../core/services/business-setting.service';
import { NOTIFICATION_TYPES, NotificationLogEntry, NotificationLogService } from '../../../core/services/notification-log.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { extractPalette, isHexColor, readableTextOn } from '../../../core/utils/color';
import { resizeImage } from '../../../core/utils/resize-image';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { WEEKDAYS } from '../../../core/models/staff.model';
import { ImageCropperComponent } from '../../../shared/components/image-cropper/image-cropper.component';
import { TimePickerComponent } from '../../../shared/components/time-picker/time-picker.component';
import { ToggleComponent } from '../../../shared/components/toggle/toggle.component';
import { ButtonDirective } from '../../../shared/directives/button.directive';
import { IconDirective } from '../../../shared/directives/icon.directive';
import { InputDirective } from '../../../shared/directives/input.directive';

type Tab = 'business' | 'look' | 'hours' | 'booking' | 'payments' | 'notifications';

interface DayRow {
  weekday: number;
  open: boolean;
  opens: FormControl<string | null>;
  closes: FormControl<string | null>;
}

interface ShiftRow {
  name: FormControl<string>;
  starts: FormControl<string | null>;
  ends: FormControl<string | null>;
}
type NotifyKey = 'notify_booking_received' | 'notify_booking_confirmed' | 'notify_booking_cancelled' | 'notify_admin_new_booking' | 'notify_review_request';
type ColorKey = 'theme_primary' | 'theme_secondary' | 'theme_tertiary';

const DEFAULT_COLORS: Record<ColorKey, string> = {
  theme_primary: '#0f766e',
  theme_secondary: '#b45309',
  theme_tertiary: '#7c3aed',
};

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, ButtonDirective, ErrorMessageComponent, IconDirective, ImageCropperComponent, InputDirective, TimePickerComponent, ToggleComponent],
  templateUrl: './settings.component.html',
})
export class SettingsComponent {
  private fb = inject(FormBuilder);
  private business = inject(BusinessSettingService);
  private theme = inject(ThemeService);
  private toast = inject(ToastService);
  private notificationLogs = inject(NotificationLogService);

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
  readonly coverFile = signal<File | null>(null);
  readonly weekdayList = WEEKDAYS;
  readonly days = signal<DayRow[]>([]);
  readonly shiftRows = signal<ShiftRow[]>([]);
  readonly coverData = signal<string | null | undefined>(undefined);
  readonly coverPreview = computed(() => {
    const changed = this.coverData();
    return changed === undefined ? this.business.coverSrc() : changed;
  });
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
    facebook: this.fb.control<string | null>(null),
    tiktok: this.fb.control<string | null>(null),
    youtube: this.fb.control<string | null>(null),
    pib: this.fb.control<string | null>(null),
    registration_number: this.fb.control<string | null>(null),
    theme_primary: this.fb.nonNullable.control(DEFAULT_COLORS.theme_primary),
    theme_secondary: this.fb.nonNullable.control(DEFAULT_COLORS.theme_secondary),
    theme_tertiary: this.fb.nonNullable.control(DEFAULT_COLORS.theme_tertiary),
    booking_confirmation: this.fb.nonNullable.control<ConfirmationMode>('manual'),
    slot_interval_minutes: this.fb.nonNullable.control(15),
    booking_lead_minutes: this.fb.nonNullable.control(60),
    booking_horizon_days: this.fb.nonNullable.control(60),
    booking_min_days_ahead: this.fb.nonNullable.control(1),
    cancellation_days_before: this.fb.nonNullable.control(1),
    allow_guest_booking: this.fb.nonNullable.control(true),
    notify_booking_received: this.fb.nonNullable.control(true),
    notify_booking_confirmed: this.fb.nonNullable.control(true),
    notify_booking_cancelled: this.fb.nonNullable.control(true),
    reminder_hours: this.fb.nonNullable.control(24),
    notify_admin_new_booking: this.fb.nonNullable.control(true),
    bank_account: this.fb.control<string | null>(null, Validators.pattern(/^\d{3}-\d{1,13}-\d{2}$/)),
    payee_name: this.fb.control<string | null>(null),
    payee_address: this.fb.control<string | null>(null),
    payment_code: this.fb.nonNullable.control('289', Validators.pattern(/^\d{3}$/)),
    online_payment_enabled: this.fb.nonNullable.control(false),
    reviews_enabled: this.fb.nonNullable.control(true),
    waitlist_enabled: this.fb.nonNullable.control(true),
    notify_review_request: this.fb.nonNullable.control(true),
    report_auto_enabled: this.fb.nonNullable.control(false),
    report_auto_daily: this.fb.nonNullable.control(true),
    report_auto_weekly: this.fb.nonNullable.control(true),
    report_auto_monthly: this.fb.nonNullable.control(true),
    report_auto_channel: this.fb.nonNullable.control<'mail' | 'whatsapp'>('mail'),
  });

  readonly notificationToggles: { key: NotifyKey; label: string; hint: string }[] = [
    { key: 'notify_booking_received', label: 'Termin primljen', hint: 'Klijentu, kad zakaže termin koji čeka potvrdu' },
    { key: 'notify_booking_confirmed', label: 'Termin potvrđen', hint: 'Klijentu, kad potvrdiš termin ili ga sam zakažeš (sa .ics za kalendar)' },
    { key: 'notify_booking_cancelled', label: 'Termin otkazan', hint: 'Klijentu, kad salon otkaže termin' },
    { key: 'notify_review_request', label: 'Molba za ocenu', hint: 'Klijentu, kad označiš termin kao završen — link za ocenu posete' },
    { key: 'notify_admin_new_booking', label: 'Obaveštenja za salon', hint: 'Mejl vlasniku i radniku čiji je termin: novi online termin, klijent otkazao ili pomerio' },
  ];
  readonly reminderOptions = [
    { value: 0, label: 'Bez podsetnika' },
    { value: 2, label: '2 sata pre' },
    { value: 3, label: '3 sata pre' },
    { value: 6, label: '6 sati pre' },
    { value: 12, label: '12 sati pre' },
    { value: 24, label: 'Dan pre (24 h)' },
    { value: 48, label: 'Dva dana pre (48 h)' },
  ];
  readonly notificationTypes = NOTIFICATION_TYPES;
  readonly logs = signal<NotificationLogEntry[]>([]);
  readonly logsLoading = signal(false);
  readonly testing = signal<'mail' | 'whatsapp' | null>(null);

  readonly intervals = [5, 10, 15, 20, 30, 45, 60];
  readonly minDaysOptions = [
    { value: 0, label: 'Isti dan (danas za danas)' },
    { value: 1, label: 'Najranije za sutra' },
    { value: 2, label: 'Najranije za 2 dana' },
  ];
  readonly cancellationOptions = [
    { value: 0, label: 'Do početka termina' },
    { value: 1, label: 'Najkasnije dan pre termina' },
    { value: 2, label: 'Najkasnije 2 dana pre' },
    { value: 3, label: 'Najkasnije 3 dana pre' },
  ];
  readonly leadOptions = [
    { value: 0, label: 'Bez ograničenja' },
    { value: 30, label: '30 minuta' },
    { value: 60, label: '1 sat' },
    { value: 120, label: '2 sata' },
    { value: 240, label: '4 sata' },
    { value: 1440, label: '1 dan' },
  ];

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

  private shiftRow(name: string, starts: string, ends: string): ShiftRow {
    return { name: new FormControl(name, { nonNullable: true }), starts: new FormControl(starts), ends: new FormControl(ends) };
  }

  openTab(tab: Tab): void {
    this.tab.set(tab);
    if (tab === 'notifications') this.loadLogs();
  }

  loadLogs(): void {
    this.logsLoading.set(true);
    this.notificationLogs.list().subscribe({
      next: (logs) => {
        this.logs.set(logs);
        this.logsLoading.set(false);
      },
      error: () => this.logsLoading.set(false),
    });
  }

  sendTest(channel: 'mail' | 'whatsapp'): void {
    this.testing.set(channel);
    this.notificationLogs.test(channel).subscribe({
      next: (res) => {
        this.testing.set(null);
        this.toast.success(res.message);
        this.loadLogs();
      },
      error: (err) => {
        this.testing.set(null);
        this.toast.error(apiErrorMessage(err, 'Slanje nije uspelo.'));
      },
    });
  }

  typeLabel(type: string): string {
    return this.notificationTypes[type] ?? type;
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

  onCoverSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      this.toast.error('Izaberi fotografiju (JPG, PNG ili WEBP).');
      return;
    }
    this.coverFile.set(file);
  }

  onCoverCropped(data: string): void {
    this.coverData.set(data);
    this.coverFile.set(null);
  }

  setDayOpen(row: DayRow, open: boolean): void {
    this.days.update((rows) => rows.map((r) => (r === row ? { ...r, open } : r)));
  }

  dayLabel(weekday: number): string {
    return WEEKDAYS.find((d) => d.value === weekday)?.label ?? '';
  }

  addShiftTemplate(): void {
    this.shiftRows.update((rows) => [...rows, this.shiftRow('Nova smena', '11:00', '18:00')]);
  }

  removeShiftTemplate(row: ShiftRow): void {
    this.shiftRows.update((rows) => rows.filter((r) => r !== row));
  }

  removeCover(): void {
    this.coverData.set(null);
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
      const payments = this.form.controls.bank_account.invalid || this.form.controls.payment_code.invalid;
      this.tab.set(payments ? 'payments' : 'business');
      this.error.set(payments ? 'Proveri tekući račun i šifru plaćanja.' : 'Proveri naziv i email.');
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
      facebook: clean(value.facebook),
      tiktok: clean(value.tiktok),
      youtube: clean(value.youtube),
      pib: clean(value.pib),
      registration_number: clean(value.registration_number),
      bank_account: clean(value.bank_account),
      payee_name: clean(value.payee_name),
      payee_address: clean(value.payee_address),
      logo: this.logo(),
      ...(this.coverData() !== undefined ? { cover_image: this.coverData() } : {}),
      opening_hours: this.days().map((d) => ({ weekday: d.weekday, opens_at: d.open ? d.opens.value : null, closes_at: d.open ? d.closes.value : null })),
      shifts: this.shiftRows()
        .filter((r) => r.name.value.trim() && r.starts.value && r.ends.value)
        .map((r) => ({ name: r.name.value.trim(), starts_at: r.starts.value!, ends_at: r.ends.value! })),
    };

    this.saving.set(true);
    this.error.set(null);
    this.business.update(payload).subscribe({
      next: (settings) => {
        this.saving.set(false);
        this.saved = settings;
        this.coverData.set(undefined);
        this.toast.success('Podešavanja su sačuvana.');
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(err, 'Čuvanje nije uspelo.'));
      },
    });
  }

  private fill(settings: BusinessSetting): void {
    this.days.set(
      WEEKDAYS.map((d) => {
        const day = settings.opening_hours?.find((h) => h.weekday === d.value);
        const open = !!(day?.opens_at && day.closes_at);
        return { weekday: d.value, open, opens: new FormControl(day?.opens_at ?? '08:00'), closes: new FormControl(day?.closes_at ?? '20:00') };
      }),
    );
    this.shiftRows.set((settings.shifts ?? []).map((s) => this.shiftRow(s.name, s.starts_at, s.ends_at)));
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
      facebook: settings.facebook,
      tiktok: settings.tiktok,
      youtube: settings.youtube,
      pib: settings.pib,
      registration_number: settings.registration_number,
      theme_primary: settings.theme_primary ?? DEFAULT_COLORS.theme_primary,
      theme_secondary: settings.theme_secondary ?? DEFAULT_COLORS.theme_secondary,
      theme_tertiary: settings.theme_tertiary ?? DEFAULT_COLORS.theme_tertiary,
      booking_confirmation: settings.booking_confirmation,
      slot_interval_minutes: settings.slot_interval_minutes,
      booking_lead_minutes: settings.booking_lead_minutes,
      booking_horizon_days: settings.booking_horizon_days,
      booking_min_days_ahead: settings.booking_min_days_ahead,
      cancellation_days_before: settings.cancellation_days_before,
      allow_guest_booking: settings.allow_guest_booking,
      notify_booking_received: settings.notify_booking_received,
      notify_booking_confirmed: settings.notify_booking_confirmed,
      notify_booking_cancelled: settings.notify_booking_cancelled,
      reminder_hours: settings.reminder_hours,
      notify_admin_new_booking: settings.notify_admin_new_booking,
      bank_account: settings.bank_account,
      payee_name: settings.payee_name,
      payee_address: settings.payee_address,
      payment_code: settings.payment_code || '289',
      online_payment_enabled: settings.online_payment_enabled,
      reviews_enabled: settings.reviews_enabled,
      waitlist_enabled: settings.waitlist_enabled,
      notify_review_request: settings.notify_review_request,
      report_auto_enabled: settings.report_auto_enabled ?? false,
      report_auto_daily: settings.report_auto_daily ?? true,
      report_auto_weekly: settings.report_auto_weekly ?? true,
      report_auto_monthly: settings.report_auto_monthly ?? true,
      report_auto_channel: settings.report_auto_channel ?? 'mail',
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
