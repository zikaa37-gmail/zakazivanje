self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

function setBadge(count) {
  if (!('setAppBadge' in self.navigator)) return Promise.resolve();
  return count > 0 ? self.navigator.setAppBadge(count).catch(() => {}) : self.navigator.clearAppBadge().catch(() => {});
}

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Novo obaveštenje';
  const options = {
    body: data.body || '',
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    icon: '/api/public/app-icon/192.png',
    badge: '/api/public/app-icon/192.png',
    data: { link: data.link || '/' },
  };

  event.waitUntil(Promise.all([self.registration.showNotification(title, options), setBadge(Number(data.badge) || 0)]));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.link || '/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (existing) {
        existing.postMessage({ type: 'navigate', link: event.notification.data?.link || '/' });
        return existing.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'badge') event.waitUntil(setBadge(Number(event.data.count) || 0));
});
