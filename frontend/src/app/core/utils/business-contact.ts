import { BusinessSetting, MessagingPhone } from '../models/business-setting.model';
import { contactHref } from './contact';

export interface BusinessPhone {
  kind: MessagingPhone;
  label: string;
  number: string;
  tel: string | null;
  whatsapp: string | null;
  viber: string | null;
}

export function businessPhones(settings: Partial<BusinessSetting> | null | undefined): BusinessPhone[] {
  if (!settings) return [];
  const filled = [
    { kind: 'mobile' as const, label: 'Mobilni', number: settings.mobile_phone?.trim() },
    { kind: 'landline' as const, label: 'Fiksni', number: settings.phone?.trim() },
  ].filter((p): p is { kind: MessagingPhone; label: string; number: string } => !!p.number);
  const messaging = filled.some((p) => p.kind === settings.messaging_phone) ? settings.messaging_phone : filled[0]?.kind;
  return filled.map(({ kind, label, number }) => ({
    kind,
    label,
    number,
    tel: contactHref('call', number),
    whatsapp: kind === messaging ? contactHref('whatsapp', number) : null,
    viber: kind === messaging ? contactHref('viber', number) : null,
  }));
}

export function mapQuery(settings: Partial<BusinessSetting> | null | undefined): string | null {
  if (!settings) return null;
  if (settings.map_query?.trim()) return settings.map_query.trim();
  return [settings.address, settings.city].map((v) => v?.trim()).filter(Boolean).join(', ') || null;
}

export function mapEmbedUrl(query: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;
}

export function mapOpenUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function mapDirectionsUrl(query: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
}
