import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_LOADER } from '../interceptors/loader.interceptor';
import { AuthService, PUSH_ENDPOINT_KEY } from './auth.service';
import { BusinessSettingService } from './business-setting.service';
import { ChatService } from './chat.service';
import { InboxService } from './inbox.service';

export type PushState = 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const quiet = () => ({ context: new HttpContext().set(SKIP_LOADER, true) });

function urlBase64ToBuffer(value: string): ArrayBuffer {
  const padded = (value + '='.repeat((4 - (value.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}

@Injectable({ providedIn: 'root' })
export class PushService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private business = inject(BusinessSettingService);
  private inbox = inject(InboxService);
  private chat = inject(ChatService);
  private router = inject(Router);
  private api = `${environment.apiUrl}/push`;

  private registration: ServiceWorkerRegistration | null = null;
  private installPrompt = signal<InstallPromptEvent | null>(null);

  readonly subscribed = signal(false);
  readonly busy = signal(false);
  readonly permission = signal<NotificationPermission>(typeof Notification !== 'undefined' ? Notification.permission : 'denied');
  readonly standalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
  readonly ios = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
  readonly canInstall = computed(() => this.installPrompt() !== null && !this.standalone);
  private readonly supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  readonly state = computed<PushState>(() => {
    if (!this.business.settings()?.push_public_key) return 'unsupported';
    if (this.ios && !this.standalone) return 'needs-install';
    if (!this.supported) return 'unsupported';
    if (this.permission() === 'denied') return 'denied';
    return this.subscribed() ? 'on' : 'off';
  });

  readonly badgeCount = computed(() => this.inbox.unreadCount() + this.chat.unreadCount());

  constructor() {
    if (typeof window === 'undefined') return;

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.installPrompt.set(event as InstallPromptEvent);
    });

    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'navigate' && typeof event.data.link === 'string') void this.router.navigateByUrl(event.data.link);
    });

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        this.registration = registration;
        return this.syncSubscription();
      })
      .catch(() => undefined);

    effect(() => {
      const count = this.auth.currentUser() ? this.badgeCount() : 0;
      untracked(() => this.setBadge(count));
    });

    effect(() => {
      const user = this.auth.currentUser();
      const key = this.business.settings()?.push_public_key;
      untracked(() => {
        if (user && key) void this.syncSubscription();
        else this.subscribed.set(false);
      });
    });
  }

  async enable(): Promise<boolean> {
    const key = this.business.settings()?.push_public_key;
    if (!key || !this.supported) return false;
    this.busy.set(true);
    try {
      const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      this.permission.set(permission);
      if (permission !== 'granted') return false;
      if (!this.registration) await navigator.serviceWorker.register('/sw.js');
      const registration = await navigator.serviceWorker.ready;
      this.registration = registration;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await Promise.race([
          registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToBuffer(key) }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 20000)),
        ]));
      await this.send(subscription);
      return true;
    } catch {
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  async disable(): Promise<void> {
    this.busy.set(true);
    try {
      const subscription = await this.registration?.pushManager.getSubscription();
      if (subscription) {
        await firstValueFrom(this.http.post(`${this.api}/unsubscribe`, { endpoint: subscription.endpoint }, quiet())).catch(() => undefined);
        await subscription.unsubscribe();
      }
      localStorage.removeItem(PUSH_ENDPOINT_KEY);
      this.subscribed.set(false);
    } finally {
      this.busy.set(false);
    }
  }

  async install(): Promise<void> {
    const prompt = this.installPrompt();
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice.catch(() => undefined);
    this.installPrompt.set(null);
  }

  private async syncSubscription(): Promise<void> {
    if (!this.registration || !this.auth.currentUser() || !this.business.settings()?.push_public_key) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      this.subscribed.set(false);
      return;
    }
    const subscription = await this.registration.pushManager.getSubscription().catch(() => null);
    if (!subscription) {
      this.subscribed.set(false);
      return;
    }
    await this.send(subscription).catch(() => this.subscribed.set(false));
  }

  private async send(subscription: PushSubscription): Promise<void> {
    const json = subscription.toJSON();
    await firstValueFrom(this.http.post(`${this.api}/subscribe`, { endpoint: json.endpoint, keys: json.keys }, quiet()));
    localStorage.setItem(PUSH_ENDPOINT_KEY, subscription.endpoint);
    this.subscribed.set(true);
  }

  private setBadge(count: number): void {
    const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (!nav.setAppBadge) return;
    void (count > 0 ? nav.setAppBadge(count) : nav.clearAppBadge?.())?.catch(() => undefined);
  }
}
