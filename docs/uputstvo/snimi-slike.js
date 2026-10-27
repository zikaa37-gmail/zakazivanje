const { chromium } = require('d:/Playground/Angular/scoreboard-workspace/node_modules/playwright');
const path = require('path');

const OUT = process.argv[2];
const APP = 'http://localhost:4210';
const only = process.argv[3] ? process.argv[3].split(',') : null;

async function mark(page, marks) {
  await page.evaluate((marks) => {
    document.querySelectorAll('.zk-guide-mark').forEach((n) => n.remove());
    marks.forEach((m, i) => {
      const el = typeof m.sel === 'string' ? document.querySelector(m.sel) : null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const pad = m.pad ?? 6;
      const box = document.createElement('div');
      box.className = 'zk-guide-mark';
      Object.assign(box.style, {
        position: 'fixed', left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px',
        border: '3px solid #e11d48', borderRadius: '12px', boxShadow: '0 0 0 4px rgba(225,29,72,.22)', zIndex: 2147483646, pointerEvents: 'none',
      });
      document.body.appendChild(box);
      const badge = document.createElement('div');
      badge.className = 'zk-guide-mark';
      badge.textContent = m.label ?? String(i + 1);
      const left = Math.min(window.innerWidth - 34, Math.max(4, r.left - pad - 14));
      const top = Math.max(4, r.top - pad - 14);
      Object.assign(badge.style, {
        position: 'fixed', left: left + 'px', top: top + 'px', minWidth: '28px', height: '28px', padding: '0 6px', borderRadius: '14px',
        background: '#e11d48', color: '#fff', font: '700 15px/28px system-ui, sans-serif', textAlign: 'center', zIndex: 2147483647,
        boxShadow: '0 2px 6px rgba(0,0,0,.3)', pointerEvents: 'none',
      });
      document.body.appendChild(badge);
    });
  }, marks);
}

async function shot(page, name, marks = [], opts = {}) {
  if (only && !only.includes(name)) return;
  if (marks[0] && opts.scroll !== false) {
    await page.locator(marks[0].sel).first().scrollIntoViewIfNeeded().catch(() => {});
    await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: 'center' }), marks[0].sel).catch(() => {});
  }
  await page.waitForTimeout(400);
  await mark(page, marks);
  await page.screenshot({ path: path.join(OUT, name + '.jpg'), type: 'jpeg', quality: 80, fullPage: !!opts.full });
  await page.evaluate(() => document.querySelectorAll('.zk-guide-mark').forEach((n) => n.remove()));
  console.log('shot', name);
}

(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/PC/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
  const ctxFor = async () => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5, locale: 'sr-RS' });
    await ctx.route('http://localhost:8000/**', (r) => r.continue({ url: r.request().url().replace('localhost:8000', '127.0.0.1:8010') }));
    const p = await ctx.newPage();
    p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
    await p.addStyleTag({ content: '' }).catch(() => {});
    return p;
  };
  const go = async (p, url, wait = 1500) => {
    await p.goto(APP + url);
    await p.waitForTimeout(wait);
    await p.addStyleTag({ content: '[data-testid=dev-logins]{display:none!important}' });
  };
  const login = async (p, email, password, expect) => {
    await go(p, '/login', 800);
    await p.fill('[data-testid=login-email]', email);
    await p.fill('[data-testid=login-password]', password);
    await p.click('[data-testid=login-submit]');
    await p.waitForURL(expect, { timeout: 15000 });
    await p.waitForTimeout(1500);
  };
  const closeModal = async (p) => {
    await p.keyboard.press('Escape');
    await p.waitForTimeout(300);
  };

  const o = await ctxFor();
  await go(o, '/login', 1000);
  await o.fill('[data-testid=login-email]', 'zakazivanje@fiskultura.rs');
  await o.fill('[data-testid=login-password]', '••••••••');
  await shot(o, 'admin-01-prijava', [{ sel: '[data-testid=login-email]' }, { sel: '[data-testid=login-password]' }, { sel: '[data-testid=login-submit]' }]);
  await login(o, 'zakazivanje@fiskultura.rs', 'zakazivanje2026', /admin/);

  await o.click('[data-testid=menu-toggle]');
  await o.waitForTimeout(500);
  await shot(o, 'admin-02-meni', [{ sel: '[data-testid=menu-toggle]' }, { sel: '[data-testid=nav-settings]' }], { scroll: false });
  await closeModal(o);

  await go(o, '/admin/settings?tab=business');
  await shot(o, 'admin-03-podaci-firme', [{ sel: '[data-testid=tab-business]' }, { sel: '#s-name' }, { sel: 'form button[type=submit], [data-testid=settings-save]' }], { scroll: false });
  await shot(o, 'admin-03b-kontakt', [{ sel: '#s-address' }, { sel: '#s-phone' }, { sel: '[data-testid=settings-instagram]' }]);
  await o.click('[data-testid=tab-look]');
  await shot(o, 'admin-04-logo-boje', [{ sel: '[data-testid=tab-look]' }, { sel: '[data-testid=cover-card]' }], { scroll: false });
  await o.click('[data-testid=tab-hours]');
  await shot(o, 'admin-05-radno-vreme', [{ sel: '[data-testid=tab-hours]' }], { scroll: false });

  await go(o, '/admin/services');
  await shot(o, 'admin-06-usluge', [{ sel: '[data-testid=service-add]' }], { scroll: false });
  await o.click('[data-testid=service-add]');
  await o.waitForTimeout(600);
  await shot(o, 'admin-07-nova-usluga', [{ sel: '[data-testid=service-name]' }, { sel: '[data-testid=service-duration]' }, { sel: '[data-testid=service-price]' }], { scroll: false });
  await closeModal(o);

  await go(o, '/admin/staff');
  await shot(o, 'admin-08-zaposleni', [{ sel: '[data-testid=staff-add]' }], { scroll: false });
  await o.click('[data-testid=staff-add]');
  await o.waitForTimeout(600);
  await shot(o, 'admin-09-novi-zaposleni', [{ sel: '[data-testid=staff-first-name]' }, { sel: '[data-testid=staff-last-name]' }], { scroll: false });
  await shot(o, 'admin-10-usluge-zaposlenog', [{ sel: '[data-testid^=staff-service-]' }, { sel: '[data-testid=staff-rotation]' }]);
  await o.evaluate(() => {
    const copy = [...document.querySelectorAll('.modal-body button')].find((b) => b.textContent.includes('Kopiraj ponedeljak'));
    copy?.setAttribute('data-guide', 'copy');
    copy?.scrollIntoView({ block: 'start' });
    const time = document.querySelector('.modal-body app-time-picker, .modal-body input[type=time]');
    time?.parentElement?.setAttribute('data-guide', 'time');
    const chip = [...document.querySelectorAll('.modal-body .chip')].find((c) => c.textContent.trim() === 'Pre podne');
    chip?.setAttribute('data-guide', 'shift');
  });
  await o.waitForTimeout(300);
  await shot(o, 'admin-11-radno-vreme-zaposlenog', [{ sel: '[data-guide=shift]' }, { sel: '[data-guide=time]' }, { sel: '[data-guide=copy]' }], { scroll: false });
  await closeModal(o);

  await go(o, '/admin/team');
  await shot(o, 'admin-12-nalozi-osoblja', [{ sel: '[data-testid=team-add]' }], { scroll: false });

  await go(o, '/admin/settings?tab=booking');
  await shot(o, 'admin-13-pravila-zakazivanja', [{ sel: '[data-testid=tab-booking]' }], { scroll: false });
  await o.click('[data-testid=tab-notifications]');
  await shot(o, 'admin-14-obavestenja', [{ sel: '[data-testid=tab-notifications]' }], { scroll: false });
  await o.click('[data-testid=tab-payments]');
  await shot(o, 'admin-15-placanje', [{ sel: '[data-testid=tab-payments]' }], { scroll: false });

  await go(o, '/admin/promotions');
  await shot(o, 'admin-16-akcije', [{ sel: '[data-testid=promotion-add]' }], { scroll: false });
  await go(o, '/admin/gallery');
  await shot(o, 'admin-17-galerija', [{ sel: '[data-testid=gallery-add]' }, { sel: '[data-testid^=gallery-featured-]' }], { scroll: false });
  await go(o, '/admin/settings?tab=social');
  await shot(o, 'admin-18-instagram', [{ sel: '[data-testid=tab-social]' }, { sel: '[data-testid=instagram-card]' }], { scroll: false });
  await shot(o, 'admin-18b-link-bio', [{ sel: '[data-testid=instagram-bio-copy]' }]);
  await go(o, '/admin/share');
  await shot(o, 'admin-19-podeli', [{ sel: '[data-testid=share-instagram]' }], { scroll: false });
  await shot(o, 'admin-19b-linkovi', [{ sel: '[data-testid=share-ig-copy]' }, { sel: '[data-testid=share-ig-story]' }]);

  await go(o, '/admin/dashboard', 2500);
  await shot(o, 'rad-01-pregled', [{ sel: '[data-testid=dashboard-today-appointments]' }], { scroll: false });
  await shot(o, 'rad-02-statistika', [{ sel: '[data-testid=dashboard-charts-toggle]' }]);
  await go(o, '/admin/calendar', 2500);
  await shot(o, 'rad-03-kalendar', [{ sel: '[data-testid=calendar-new]' }, { sel: '[data-testid=calendar-block]' }, { sel: '[data-testid=view-day]' }], { scroll: false });
  await o.click('[data-testid=calendar-new]');
  await o.waitForTimeout(800);
  await shot(o, 'rad-04-novi-termin', [{ sel: 'input[data-testid=appointment-client-search]' }], { scroll: false });
  await closeModal(o);
  await go(o, '/admin/appointments', 2500);
  const actions = o.locator('[data-testid^=appointment-actions-][data-testid$=-more]').first();
  await o.evaluate(() => document.querySelector('[data-testid^=appointment-actions-]')?.scrollIntoView({ block: 'center' }));
  await o.evaluate(() => {
    const confirm = document.querySelector('[data-testid^=confirm-]');
    confirm?.setAttribute('data-guide', 'confirm');
    const row = [...document.querySelectorAll('.badge')].find((b) => b.textContent.trim() === 'Potvrđen')?.parentElement;
    row?.querySelector('.row-actions-trigger')?.setAttribute('data-guide', 'more');
  });
  await o.evaluate(() => document.querySelector('[data-guide=more]')?.scrollIntoView({ block: 'center' }));
  await shot(o, 'rad-05-termini', [{ sel: '[data-guide=confirm]' }, { sel: '[data-guide=more]' }], { scroll: false });
  await o.click('[data-guide=more]');
  await o.waitForTimeout(400);
  await shot(o, 'rad-06-status-termina', [{ sel: '.row-actions-menu' }], { scroll: false });
  await closeModal(o);
  await go(o, '/admin/clients', 2000);
  await shot(o, 'rad-07-klijenti', [{ sel: '[data-testid=client-search]' }, { sel: '[data-testid=client-add]' }], { scroll: false });
  await go(o, '/admin/reports', 2000);
  await shot(o, 'rad-08-izvestaji', [{ sel: '[data-testid=report-options]' }, { sel: '[data-testid=report-pdf]' }], { scroll: false });
  await go(o, '/admin/reviews', 2000);
  await shot(o, 'rad-09-recenzije', [], { scroll: false });

  const w = await ctxFor();
  await login(w, 'radnik@fiskultura.rs', 'radnik2026', /admin/);
  await w.click('[data-testid=menu-toggle]');
  await w.waitForTimeout(500);
  await shot(w, 'radnik-01-meni', [{ sel: '[data-testid=admin-sidebar] nav, [data-testid=admin-sidebar]' }], { scroll: false });

  const a = await ctxFor();
  await go(a, '/', 2500);
  await shot(a, 'klijent-01-pocetna', [{ sel: '[data-testid=home-book]' }, { sel: '[data-testid=home-register]' }], { scroll: false });
  await a.click('[data-testid=home-book]');
  await a.waitForTimeout(600);
  await shot(a, 'klijent-02-izbor', [{ sel: '[data-testid=home-modal-register]' }], { scroll: false });
  await closeModal(a);
  await go(a, '/register', 1200);
  await shot(a, 'klijent-03-registracija', [{ sel: '[data-testid=register-first-name]' }, { sel: '[data-testid=register-submit]' }], { full: true, scroll: false });

  const c = await ctxFor();
  await login(c, 'devtestzikaa@gmail.com', 'test', /my-appointments|\/$/);
  await go(c, '/book', 2000);
  await c.evaluate(() => sessionStorage.clear());
  await go(c, '/book', 2000);
  const firstService = c.locator('[data-testid^=book-service-]').first();
  await firstService.click();
  await c.waitForTimeout(300);
  await shot(c, 'klijent-04-usluga', [{ sel: '[data-testid^=book-service-].selected' }, { sel: '[data-testid=book-next]' }], { scroll: false });
  await c.click('[data-testid=book-next]');
  await c.waitForTimeout(1200);
  await shot(c, 'klijent-05-frizer', [{ sel: '[data-testid^=book-staff-]' }], { scroll: false });
  await c.locator('[data-testid^=book-staff-]').first().click();
  await c.waitForTimeout(300);
  await c.click('[data-testid=book-next]').catch(() => {});
  await c.waitForTimeout(2000);
  const day = c.locator('[data-testid^=book-day-]:not([disabled]):not(.full)').first();
  await day.click();
  await c.waitForTimeout(1500);
  const slot = c.locator('[data-testid^=book-slot-]').first();
  await slot.click();
  await c.waitForTimeout(300);
  await shot(c, 'klijent-06-termin', [{ sel: '.day-pill.selected' }, { sel: '.slot.selected' }], { scroll: false });
  await c.click('[data-testid=book-next]');
  await c.waitForTimeout(1500);
  await shot(c, 'klijent-07-potvrda', [{ sel: '[data-testid=book-submit]' }]);
  await c.evaluate(() => sessionStorage.clear());
  await go(c, '/my-appointments', 2500);
  await shot(c, 'klijent-08-moji-termini', [{ sel: '[data-testid^=my-reschedule-]' }, { sel: '[data-testid^=my-cancel-]' }]);
  await c.click('[data-testid=my-past]');
  await c.waitForTimeout(1500);
  await shot(c, 'klijent-09-prosli', [{ sel: '[data-testid=my-past]' }, { sel: '[data-testid=my-calendar]' }], { scroll: false });
  await go(c, '/profile', 1500);
  await shot(c, 'klijent-10-profil', [{ sel: '[data-testid=profile-favorite]' }]);

  await b.close();
})();
