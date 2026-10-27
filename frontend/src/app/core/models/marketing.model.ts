export interface Referral {
  source: string;
  campaign: string | null;
}

export interface SourceRow {
  source: string;
  campaign: string | null;
  visits: number;
  registrations: number;
  bookings: number;
  completed: number;
  revenue: number;
}

export interface InstagramPost {
  id: string;
  caption: string | null;
  type: string;
  image: string;
  permalink: string;
  posted_at: string | null;
}

export interface InstagramState {
  instagram_connected: boolean;
  instagram_username: string | null;
  instagram_token_expires_at: string | null;
  instagram_feed_enabled: boolean;
  instagram_insights_enabled?: boolean;
}

export const SOURCE_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  google: 'Google',
  qr: 'QR kod',
  direct: 'Direktno',
};

export function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

export const INSTAGRAM_PLACEMENTS: { value: string; label: string }[] = [
  { value: 'bio', label: 'Link u biju' },
  { value: 'story', label: 'Story' },
  { value: 'objava', label: 'Objava' },
  { value: 'reklama', label: 'Plaćena reklama' },
];
