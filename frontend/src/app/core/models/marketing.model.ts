export interface Referral {
  source: string;
  campaign: string | null;
}

export interface SourceRow {
  source: string;
  campaign: string | null;
  visits: number;
  registrations: number;
  logins: number;
  bookings: number;
  new_clients: number;
  completed: number;
  revenue: number;
}

export interface InstagramTopPost {
  id: string;
  caption: string | null;
  image: string | null;
  permalink: string | null;
  posted_at: string;
  reach: number;
  interactions: number;
}

export interface InstagramInsights {
  available: boolean;
  from: string;
  to: string;
  reach: number;
  profile_views: number;
  website_clicks: number;
  accounts_engaged: number;
  total_interactions: number;
  top_posts: InstagramTopPost[];
}

export interface SourcesReport {
  rows: SourceRow[];
  instagram: InstagramInsights | null;
}

export interface FunnelStep {
  key: string;
  label: string;
  value: number;
  hint: string;
  money?: boolean;
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

export type InstagramPostKind = 'post' | 'story';

export type InstagramPostStatus = 'scheduled' | 'publishing' | 'published' | 'failed' | 'skipped';

export interface FreeSlotRange {
  from: string;
  to: string;
}

export interface ScheduledInstagramPost {
  id: number;
  kind: InstagramPostKind;
  source: 'manual' | 'free_slots';
  caption: string | null;
  status: InstagramPostStatus;
  scheduled_at: string;
  published_at: string | null;
  permalink: string | null;
  error: string | null;
  slots: { date: string; ranges: FreeSlotRange[] } | null;
  image_url: string | null;
}

export interface NewInstagramPost {
  kind: InstagramPostKind;
  caption: string | null;
  image: string;
  scheduled_at: string | null;
}

export interface FreeSlotsPreview {
  label: string;
  date: string;
  ranges: FreeSlotRange[];
  image: string | null;
}

export const INSTAGRAM_POST_STATUS: Record<InstagramPostStatus, { label: string; badge: string }> = {
  scheduled: { label: 'Zakazano', badge: 'badge-warning' },
  publishing: { label: 'Objavljuje se', badge: 'badge-warning' },
  published: { label: 'Objavljeno', badge: 'badge-success' },
  failed: { label: 'Nije uspelo', badge: 'badge-danger' },
  skipped: { label: 'Preskočeno', badge: 'badge-neutral' },
};

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
