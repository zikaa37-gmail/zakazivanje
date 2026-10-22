import { BusinessSetting } from '../models/business-setting.model';

export type SocialNetwork = 'instagram' | 'facebook' | 'tiktok' | 'youtube';

export interface SocialLink {
  network: SocialNetwork;
  label: string;
  url: string;
  handle: string;
}

const NETWORKS: { network: SocialNetwork; label: string; base: string; at: boolean }[] = [
  { network: 'instagram', label: 'Instagram', base: 'https://www.instagram.com/', at: true },
  { network: 'facebook', label: 'Facebook', base: 'https://www.facebook.com/', at: false },
  { network: 'tiktok', label: 'TikTok', base: 'https://www.tiktok.com/@', at: true },
  { network: 'youtube', label: 'YouTube', base: 'https://www.youtube.com/@', at: true },
];

export function socialLinks(settings: Partial<BusinessSetting> | null | undefined): SocialLink[] {
  if (!settings) return [];
  return NETWORKS.flatMap(({ network, label, base, at }) => {
    const value = settings[network]?.trim();
    if (!value) return [];
    if (/^https?:\/\//i.test(value)) {
      const last = value.replace(/[?#].*$/, '').replace(/\/+$/, '').split('/').pop() ?? '';
      const name = last.replace(/^@/, '');
      return [{ network, label, url: value, handle: name ? (at ? `@${name}` : name) : label }];
    }
    const name = value.replace(/^@/, '');
    return [{ network, label, url: base + encodeURIComponent(name), handle: at ? `@${name}` : name }];
  });
}
