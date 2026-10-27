import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_LOADER } from '../interceptors/loader.interceptor';
import { InstagramPost, InstagramState, Referral, SourceRow } from '../models/marketing.model';

const REFERRAL_KEY = 'zk_referral';
const VISIT_KEY = 'zk_visit';
const REFERRAL_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const REFERRER_SOURCES: [RegExp, string][] = [
  [/(^|\.)instagram\.com$/, 'instagram'],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, 'facebook'],
  [/(^|\.)tiktok\.com$/, 'tiktok'],
  [/(^|\.)google\./, 'google'],
];

@Injectable({ providedIn: 'root' })
export class MarketingService {
  private http = inject(HttpClient);
  private quiet = { context: new HttpContext().set(SKIP_LOADER, true) };

  capture(): void {
    const params = new URLSearchParams(window.location.search);
    const source = slug(params.get('izvor') ?? params.get('utm_source'), 30);
    const fresh: Referral | null = source
      ? { source, campaign: slug(params.get('kampanja') ?? params.get('utm_campaign'), 60) }
      : this.fromReferrer();

    if (fresh) {
      try {
        localStorage.setItem(REFERRAL_KEY, JSON.stringify({ ...fresh, at: Date.now() }));
      } catch {}
    }

    try {
      if (sessionStorage.getItem(VISIT_KEY)) return;
      sessionStorage.setItem(VISIT_KEY, '1');
    } catch {}
    const visit = fresh ?? { source: 'direct', campaign: null };
    this.http.post(`${environment.apiUrl}/public/visit`, visit, this.quiet).subscribe({ error: () => undefined });
  }

  referral(): Referral | null {
    try {
      const stored = JSON.parse(localStorage.getItem(REFERRAL_KEY) ?? 'null') as (Referral & { at: number }) | null;
      if (!stored || Date.now() - stored.at > REFERRAL_TTL_MS) return null;
      return { source: stored.source, campaign: stored.campaign };
    } catch {
      return null;
    }
  }

  link(base: string, source: string, campaign: string | null): string {
    const url = new URL(base);
    url.searchParams.set('izvor', source);
    const c = slug(campaign, 60);
    if (c) url.searchParams.set('kampanja', c);
    return url.toString();
  }

  sources(from: string, to: string): Observable<SourceRow[]> {
    return this.http.post<SourceRow[]>(`${environment.apiUrl}/dashboard/sources`, { from, to }, this.quiet);
  }

  instagramPosts(): Observable<InstagramPost[]> {
    return this.http.get<InstagramPost[]>(`${environment.apiUrl}/public/instagram`, this.quiet);
  }

  connectInstagram(token: string): Observable<InstagramState> {
    return this.http.post<InstagramState>(`${environment.apiUrl}/instagram/connect`, { token });
  }

  disconnectInstagram(): Observable<InstagramState> {
    return this.http.delete<InstagramState>(`${environment.apiUrl}/instagram`);
  }

  private fromReferrer(): Referral | null {
    try {
      const host = new URL(document.referrer).hostname;
      if (host === window.location.hostname) return null;
      const match = REFERRER_SOURCES.find(([pattern]) => pattern.test(host));
      return match ? { source: match[1], campaign: null } : null;
    } catch {
      return null;
    }
  }
}

export function slug(value: string | null | undefined, max: number): string | null {
  const cleaned = (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'dj')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max);
  return cleaned || null;
}
