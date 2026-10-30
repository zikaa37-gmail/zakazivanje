import type { RowAction } from '../../shared/components/row-actions/row-actions.component';

export type ContactChannel = 'call' | 'sms' | 'whatsapp' | 'viber';

const CHANNELS: { id: ContactChannel; label: string; icon: RowAction['icon']; phoneOnly: boolean }[] = [
  { id: 'call', label: 'Pozovi', icon: 'phone', phoneOnly: true },
  { id: 'sms', label: 'SMS poruka', icon: 'message-square', phoneOnly: true },
  { id: 'whatsapp', label: 'WhatsApp poruka', icon: 'send', phoneOnly: false },
  { id: 'viber', label: 'Viber poruka', icon: 'message-square', phoneOnly: false },
];

export function canPlaceCalls(): boolean {
  return /iPhone|iPod|Android.*Mobile|Windows Phone/i.test(navigator.userAgent);
}

export function internationalPhone(phone: string | null | undefined): string | null {
  let digits = (phone ?? '').replace(/[^\d+]/g, '');
  if (digits === '' || digits === '+') return null;
  if (digits.startsWith('00')) digits = '+' + digits.slice(2);
  else if (digits.startsWith('0')) digits = '+381' + digits.slice(1);
  else if (!digits.startsWith('+')) digits = '+' + digits;
  return /^\+\d{8,15}$/.test(digits) ? digits : null;
}

export function contactHref(channel: ContactChannel, phone: string | null | undefined): string | null {
  const number = internationalPhone(phone);
  if (!number) return null;
  switch (channel) {
    case 'call':
      return `tel:${number}`;
    case 'sms':
      return `sms:${number}`;
    case 'whatsapp':
      return `https://wa.me/${number.slice(1)}`;
    case 'viber':
      return `viber://chat?number=${encodeURIComponent(number)}`;
  }
}

export function contactChannels(phone: string | null | undefined): { id: ContactChannel; label: string; icon: RowAction['icon']; href: string }[] {
  const phoneDevice = canPlaceCalls();
  return CHANNELS.filter((c) => phoneDevice || !c.phoneOnly).flatMap((c) => {
    const href = contactHref(c.id, phone);
    return href ? [{ id: c.id, label: c.label, icon: c.icon, href }] : [];
  });
}

export function contactActions(phone: string | null | undefined): RowAction[] {
  return contactChannels(phone).map(({ id, label, icon }) => ({ id, label, icon }));
}

export function openContact(channel: string, phone: string | null | undefined): boolean {
  if (!CHANNELS.some((c) => c.id === channel)) return false;
  const href = contactHref(channel as ContactChannel, phone);
  if (!href) return false;
  if (channel === 'whatsapp') window.open(href, '_blank', 'noopener');
  else window.location.href = href;
  return true;
}
