const { chromium } = require('d:/Playground/Angular/scoreboard-workspace/node_modules/playwright');
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const OUT = path.resolve(process.argv[2] || path.join(__dirname, '../../frontend/public/uputstvo/slike'));
const APP = 'http://localhost:5110';
const BACKEND = path.resolve(__dirname, '../../backend');
const CHROME = 'C:/Users/PC/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe';
const PHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const only = process.argv[3] ? process.argv[3].split(',') : null;
const LOGIN = { owner: 0, manager: 1, worker: 2, client: 3 };
const shots = new Map();

function tinker(code) {
  const res = spawnSync('php', ['artisan', 'tinker', '--execute', code], { cwd: BACKEND, encoding: 'utf8' });
  if (res.status !== 0) throw new Error('tinker: ' + (res.stderr || res.stdout));
  return res.stdout.trim();
}

function snapshot() {
  return JSON.parse(
    tinker(
      'echo json_encode(["appointments" => (int) DB::table("appointments")->max("id"), "notifications" => (int) DB::table("notification_logs")->max("id"), "activity" => (int) DB::table("client_activity_logs")->max("id"), "promotions" => (int) DB::table("promotions")->max("id"), "paused" => DB::table("services")->pluck("paused_until", "id"), "pauseName" => DB::table("services")->where("active", 1)->where("audience", "all")->whereNull("paused_until")->orderBy("id")->value("name")]);',
    ),
  );
}

function cleanup(s) {
  const paused = Object.entries(s.paused)
    .map(([id, until]) => `DB::table("services")->where("id", ${Number(id)})->update(["paused_until" => ${until ? JSON.stringify(until) : 'null'}]);`)
    .join(' ');
  const out = tinker(
    `$ids = DB::table("appointments")->where("id", ">", ${s.appointments})->pluck("id"); ` +
      `DB::table("notification_logs")->where("id", ">", ${s.notifications})->delete(); ` +
      `DB::table("reviews")->whereIn("appointment_id", $ids)->delete(); ` +
      `DB::table("appointment_items")->whereIn("appointment_id", $ids)->delete(); ` +
      `DB::table("appointments")->whereIn("id", $ids)->delete(); ` +
      `DB::table("client_activity_logs")->where("id", ">", ${s.activity})->delete(); ` +
      `$promos = DB::table("promotions")->where("id", ">", ${s.promotions})->pluck("id"); ` +
      `DB::table("promotion_service")->whereIn("promotion_id", $promos)->delete(); ` +
      `DB::table("promotions")->whereIn("id", $promos)->delete(); ` +
      paused +
      ` echo "obrisano termina: " . count($ids) . ", akcija: " . count($promos);`,
  );
  console.log(out);
}

async function mark(page, marks) {
  const missing = await page.evaluate((marks) => {
    document.querySelectorAll('.zk-guide-mark').forEach((n) => n.remove());
    const missing = [];
    marks.forEach((m, i) => {
      const el = [...document.querySelectorAll(m.sel)].find((e) => e.getBoundingClientRect().width > 0);
      if (!el) {
        missing.push(m.sel);
        return;
      }
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
    return missing;
  }, marks);
  return missing;
}

async function settle(page) {
  await page
    .waitForFunction(() => {
      const spinner = document.querySelector('app-spinner');
      return !spinner || ![...spinner.querySelectorAll('*')].some((e) => e.getBoundingClientRect().width > 0);
    }, null, { timeout: 20000 })
    .catch(() => {});
}

async function shot(page, name, marks = [], opts = {}) {
  if (only && !only.includes(name)) return;
  await settle(page);
  if (marks[0] && opts.scroll !== false) {
    await page.evaluate(([sel, block]) => [...document.querySelectorAll(sel)].find((e) => e.getBoundingClientRect().width > 0)?.scrollIntoView({ block }), [marks[0].sel, opts.block ?? 'center']).catch(() => {});
  }
  await page.waitForTimeout(400);
  const missing = await mark(page, marks);
  shots.set(name, await page.screenshot({ type: 'jpeg', quality: 80, fullPage: !!opts.full }));
  await page.evaluate(() => document.querySelectorAll('.zk-guide-mark').forEach((n) => n.remove()));
  console.log('shot', name, missing.length ? 'NEMA OZNAKE: ' + missing.join(' | ') : '');
}

async function guide(page, attr, fn, arg) {
  await page.evaluate(
    ([attr, fn, arg]) => {
      const el = new Function('arg', fn)(arg);
      el?.setAttribute('data-guide', attr);
    },
    [attr, fn, arg],
  );
}

(async () => {
  const before = snapshot();
  const b = await chromium.launch({ executablePath: CHROME, args: ['--lang=sr-Latn-RS'] });
  try {
    await run(b, before);
  } finally {
    await b.close();
    cleanup(before);
    for (const [name, data] of shots) fs.writeFileSync(path.join(OUT, name + '.jpg'), data);
    console.log('sačuvano slika:', shots.size);
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

async function run(b, before) {
  const ctxFor = async () => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5, locale: 'sr-RS', userAgent: PHONE_UA });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
    return p;
  };
  const hideDev = (p) => p.addStyleTag({ content: '[data-testid=dev-logins]{display:none!important}' });
  const go = async (p, url, wait = 1500, ready = null) => {
    await p.goto(APP + url);
    if (ready) await p.waitForSelector(ready, { timeout: 30000, state: 'attached' }).catch(() => console.log('NIJE UCITANO', url, ready));
    await p.waitForTimeout(wait);
    await settle(p);
    await hideDev(p);
  };
  const quickLogin = async (p, index, expect) => {
    await p.goto(APP + '/login');
    await p.waitForSelector(`[data-testid=dev-login-${index}]`);
    await p.click(`[data-testid=dev-login-${index}]`);
    await p.waitForURL(expect, { timeout: 15000 });
    await p.waitForTimeout(1500);
  };
  const closeModal = async (p) => {
    await p.keyboard.press('Escape');
    await p.waitForTimeout(400);
  };
  const openMenu = async (p) => {
    await p.click('[data-testid=menu-toggle]');
    await p.waitForTimeout(500);
  };
  const clickVisible = async (p, sel) => {
    const ok = await p.evaluate((sel) => {
      document.querySelectorAll('[data-guide-click]').forEach((e) => e.removeAttribute('data-guide-click'));
      const el = [...document.querySelectorAll(sel)].find((e) => e.getBoundingClientRect().width > 0);
      el?.scrollIntoView({ block: 'center' });
      el?.setAttribute('data-guide-click', '');
      return !!el;
    }, sel);
    if (ok) await p.click('[data-guide-click]', { timeout: 5000 }).catch((e) => console.log('KLIK', sel, e.message.split(String.fromCharCode(10))[0]));
    await p.waitForTimeout(500);
    return ok;
  };
  const clickMenuItem = async (p, text) => {
    await p.locator('.row-actions-menu .row-actions-item', { hasText: text }).first().click();
    await p.waitForTimeout(600);
  };

  const o = await ctxFor();
  await go(o, '/login', 1000);
  await o.fill('[data-testid=login-email]', 'vas@email.rs');
  await o.fill('[data-testid=login-password]', 'lozinka123');
  await shot(o, 'admin-01-prijava', [{ sel: '[data-testid=login-email]' }, { sel: '[data-testid=login-password]' }, { sel: '[data-testid=login-submit]' }, { sel: '[data-testid=login-forgot]' }]);
  await quickLogin(o, LOGIN.owner, /admin/);

  await openMenu(o);
  await shot(o, 'admin-02-meni', [{ sel: '[data-testid=nav-section-daily]' }, { sel: '[data-testid=nav-section-manage]' }, { sel: '[data-testid=nav-guide]' }], { scroll: false });
  await o.click('[data-testid=nav-section-manage]');
  await o.waitForTimeout(400);
  await shot(o, 'admin-02b-upravljanje', [{ sel: '[data-testid=nav-section-manage]' }, { sel: '[data-testid=nav-staff]' }, { sel: '[data-testid=nav-settings]' }], { scroll: false });
  await closeModal(o);

  await go(o, '/admin/settings?tab=business', 1500, '#s-name');
  await shot(o, 'admin-03-podaci-firme', [{ sel: '[data-testid=tab-business]' }, { sel: '#s-name' }, { sel: '[data-testid=settings-save]' }], { scroll: false });
  await shot(o, 'admin-03b-kontakt', [{ sel: '#s-address' }, { sel: '#s-phone' }, { sel: '#s-instagram' }]);
  await o.click('[data-testid=tab-look]');
  await shot(o, 'admin-04-logo-boje', [{ sel: '[data-testid=tab-look]' }, { sel: '[data-testid=cover-card]' }], { scroll: false });
  await o.click('[data-testid=tab-hours]');
  await shot(o, 'admin-05-radno-vreme', [{ sel: '[data-testid=tab-hours]' }], { scroll: false });
  await o.click('[data-testid=tab-booking]');
  await o.waitForTimeout(400);
  await guide(o, 'confirmation', "return document.querySelector('[data-testid^=confirmation-]')?.parentElement");
  await shot(o, 'admin-13-pravila-zakazivanja', [{ sel: '[data-guide=confirmation]' }]);
  await o.click('[data-testid=tab-notifications]');
  await shot(o, 'admin-14-obavestenja', [{ sel: '[data-testid=tab-notifications]' }], { scroll: false });
  await o.click('[data-testid=tab-payments]');
  await shot(o, 'admin-15-placanje', [{ sel: '[data-testid=tab-payments]' }], { scroll: false });

  await go(o, '/admin/services', 1500, '.row-actions-trigger');
  await shot(o, 'admin-06-usluge', [{ sel: '[data-testid=service-add]' }], { scroll: false });
  await o.click('[data-testid=service-add]');
  await o.waitForTimeout(600);
  await guide(o, 'confirmation', "return document.querySelector('[data-testid=service-confirmation-staff]')?.parentElement");
  await shot(o, 'admin-07-nova-usluga', [{ sel: '[data-testid=service-name]' }, { sel: '[data-testid=service-duration]' }, { sel: '[data-testid=service-price]' }, { sel: '[data-guide=confirmation]' }], { scroll: false });
  await closeModal(o);
  await o.evaluate((name) => {
    const rows = [...document.querySelectorAll('.row-actions-trigger')].filter((t) => t.getBoundingClientRect().width > 0);
    const trigger = rows.find((t) => t.parentElement?.parentElement?.textContent.includes(name)) ?? rows[0];
    trigger?.setAttribute('data-guide', 'service-actions');
  }, before.pauseName ?? '');
  await clickVisible(o, '[data-guide=service-actions]');
  await shot(o, 'admin-07b-usluga-meni', [{ sel: '.row-actions-menu' }], { scroll: false });
  await clickMenuItem(o, 'Privremeno pauziraj');
  const pauseUntil = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  await o.fill('[data-testid=service-pause-until]', pauseUntil);
  await shot(o, 'admin-07c-pauza', [{ sel: '[data-testid=service-pause-until]' }, { sel: '[data-testid=service-pause-save]' }], { scroll: false });
  await o.click('[data-testid=service-pause-save]');
  await o.waitForTimeout(1000);

  await go(o, '/admin/staff', 1500, '[data-testid^=staff-actions-]');
  await shot(o, 'admin-08-zaposleni', [{ sel: '[data-testid=team-tab-staff]' }, { sel: '[data-testid=team-tab-accounts]' }, { sel: '[data-testid=staff-add]' }], { scroll: false });
  await o.click('[data-testid=staff-add]');
  await o.waitForTimeout(600);
  await shot(o, 'admin-09-novi-zaposleni', [{ sel: '[data-testid=staff-first-name]' }, { sel: '[data-testid=staff-last-name]' }, { sel: '[data-testid=staff-confirmation]' }], { block: 'start' });
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

  await go(o, '/admin/team', 1500, '.row-actions-trigger');
  await shot(o, 'admin-12-nalozi', [{ sel: '[data-testid=team-tab-accounts]' }, { sel: '[data-testid=team-add]' }], { scroll: false });
  await o.evaluate(() => {
    const rows = [...document.querySelectorAll('[data-testid^=team-]')].filter((r) => /^team-\d+$/.test(r.dataset.testid));
    const row = rows.find((r) => r.textContent.includes('Čeka lozinku')) ?? rows.find((r) => r.querySelector('.row-actions-trigger'));
    row?.querySelector('.row-actions-trigger')?.setAttribute('data-guide', 'invite');
    row?.scrollIntoView({ block: 'center' });
  });
  await clickVisible(o, '[data-guide=invite]');
  await shot(o, 'admin-12b-pozivnica', [{ sel: '.row-actions-menu' }], { scroll: false });
  await closeModal(o);

  await go(o, '/admin/promotions', 1500, '.row-actions-trigger');
  await shot(o, 'admin-16-akcije', [{ sel: '[data-testid=promotion-add]' }], { scroll: false });
  await o.click('[data-testid=promotion-add]');
  await o.waitForTimeout(600);
  await guide(o, 'presets', "return document.querySelector('[data-testid^=promotion-preset-]')?.parentElement");
  await shot(o, 'admin-16b-brzi-pocetak', [{ sel: '[data-guide=presets]' }], { scroll: false });
  await o.click('[data-testid=promotion-preset-instagram]');
  await o.waitForTimeout(400);
  await shot(o, 'admin-16c-kod', [{ sel: '[data-testid=promotion-code]' }, { sel: '[data-testid=promotion-max-uses]' }, { sel: '.modal-body app-toggle' }]);
  await o.click('[data-testid=promotion-save]');
  await o.waitForTimeout(1200);
  await o.evaluate(() => {
    const badge = document.querySelector('[data-testid^=promotion-code-]');
    const card = badge?.closest('.card');
    card?.setAttribute('data-guide', 'promo');
    card?.querySelector('.row-actions-trigger')?.setAttribute('data-guide', 'promo-actions');
    card?.scrollIntoView({ block: 'start' });
  });
  await o.waitForTimeout(3000);
  await clickVisible(o, '[data-guide=promo-actions]');
  if (!(await o.locator('.row-actions-menu').count())) await clickVisible(o, '[data-guide=promo-actions]');
  await shot(o, 'admin-16d-kopija', [{ sel: '[data-testid^=promotion-code-]' }, { sel: '.row-actions-menu' }], { scroll: false });
  await closeModal(o);

  await go(o, '/admin/gallery', 1500, '[data-testid^=gallery-item-]');
  await shot(o, 'admin-17-galerija', [{ sel: '[data-testid=gallery-add]' }, { sel: '[data-testid^=gallery-featured-]' }], { scroll: false });
  await go(o, '/admin/settings?tab=social', 1500, '[data-testid=instagram-card]');
  await shot(o, 'admin-18-instagram', [{ sel: '[data-testid=tab-social]' }, { sel: '[data-testid=instagram-card]' }], { scroll: false });
  await shot(o, 'admin-18b-link-bio', [{ sel: '[data-testid=instagram-bio-copy]' }]);
  await go(o, '/admin/share', 2000, '[data-testid=share-instagram]');
  await shot(o, 'admin-19-podeli', [{ sel: '[data-testid=share-instagram]' }], { scroll: false });
  await o.click('[data-testid=share-template-promotion]');
  await o.waitForTimeout(500);
  await o.evaluate(() => {
    const select = document.querySelector('[data-testid=share-promotion]');
    const option = [...(select?.options ?? [])].find((op) => op.textContent.includes('Instagram'));
    if (select && option) {
      select.value = option.value;
      select.dispatchEvent(new Event('change'));
    }
  });
  await o.waitForTimeout(1500);
  await shot(o, 'admin-19c-akcija-kod', [{ sel: '[data-testid=share-image], [data-testid=share-canvas]' }]);
  await shot(o, 'admin-19b-linkovi', [{ sel: '[data-testid=share-ig-copy]' }, { sel: '[data-testid=share-ig-story]' }]);

  await go(o, '/admin/dashboard', 2500, '[data-testid=dashboard-today]');
  await shot(o, 'rad-01-pregled', [{ sel: '[data-testid=dashboard-staff-filter]' }, { sel: '[data-testid=dashboard-today-appointments]' }, { sel: '[data-testid^=complete-]' }], { scroll: false });
  await shot(o, 'rad-02-statistika', [{ sel: '[data-testid=dashboard-charts-toggle]' }]);
  const todayIds = await o.evaluate(() => [...document.querySelectorAll('[data-testid^=today-]')].map((e) => e.dataset.testid).filter((t) => /^today-\d+$/.test(t)));
  for (const id of todayIds) {
    await clickVisible(o, `[data-testid=${id}]`);
    await o.waitForTimeout(500);
    if (await o.locator('[data-testid=details-payment]').count()) {
      await shot(o, 'rad-06b-naplata', [{ sel: '[data-testid=details-tip]' }, { sel: '[data-testid^=details-paid-]' }, { sel: '[data-testid^=contact-]' }], { scroll: false });
      break;
    }
    await closeModal(o);
  }
  await closeModal(o);

  await go(o, '/admin/calendar', 2500, '[data-testid=calendar-grid]');
  await shot(o, 'rad-03-kalendar', [{ sel: '[data-testid=calendar-new]' }, { sel: '[data-testid=calendar-block]' }, { sel: '[data-testid=view-day]' }], { scroll: false });
  await o.click('[data-testid=calendar-new]');
  await o.waitForTimeout(800);
  await shot(o, 'rad-04-novi-termin', [{ sel: 'input[data-testid=appointment-client-search]' }], { scroll: false });
  await closeModal(o);

  await go(o, '/admin/appointments', 2500, '[data-testid^=appointment-actions-]');
  await o.evaluate(() => {
    document.querySelector('[data-testid^=appointment-actions-]')?.scrollIntoView({ block: 'center' });
    const row = [...document.querySelectorAll('.badge')].find((b) => b.textContent.trim() === 'Na čekanju')?.parentElement;
    row?.querySelector('.row-actions-trigger')?.setAttribute('data-guide', 'pending');
    const done = [...document.querySelectorAll('.badge')].find((b) => b.textContent.trim() === 'Potvrđen')?.parentElement;
    done?.querySelector('.row-actions-trigger')?.setAttribute('data-guide', 'more');
    const cancelled = document.querySelector('.cancelled-content')?.parentElement;
    cancelled?.setAttribute('data-guide', 'cancelled');
    cancelled?.querySelector('.row-actions-trigger')?.setAttribute('data-guide', 'cancelled-more');
  });
  await shot(o, 'rad-05-termini', [{ sel: '[data-guide=pending]' }, { sel: '[data-guide=more]' }]);
  await clickVisible(o, '[data-guide=more]');
  await shot(o, 'rad-06-status-termina', [{ sel: '.row-actions-menu' }], { scroll: false });
  await closeModal(o);
  if (await o.locator('[data-guide=cancelled]').count()) {
    await shot(o, 'rad-05b-otkazan', [{ sel: '[data-guide=cancelled]' }]);
  }

  await go(o, '/admin/clients', 2000, '[data-testid=client-search]');
  await shot(o, 'rad-07-klijenti', [{ sel: '[data-testid=client-search]' }, { sel: '[data-testid=client-add]' }, { sel: '[data-testid=client-zone-filter]' }], { scroll: false });
  await go(o, '/admin/reports', 2000, '[data-testid=report]');
  await shot(o, 'rad-08-izvestaji', [{ sel: '[data-testid=report-options]' }, { sel: '[data-testid=report-pdf]' }], { scroll: false });
  await go(o, '/admin/reviews', 2000, '[data-testid^=admin-review-]');
  await shot(o, 'rad-09-recenzije', [], { scroll: false });
  await go(o, '/admin/notes', 2000, '[data-testid=note-body]');
  await o.fill('[data-testid=note-body]', 'Nestalo je farbe 7.1');
  await guide(o, 'recipients', "return document.querySelector('[data-testid^=note-recipient-]')?.parentElement");
  await shot(o, 'rad-11-beleske', [{ sel: '[data-testid=note-body]' }, { sel: '[data-guide=recipients]' }, { sel: '[data-testid=note-send]' }], { scroll: false });
  await o.fill('[data-testid=note-body]', '');

  const m = await ctxFor();
  await quickLogin(m, LOGIN.manager, /admin/);
  await go(m, '/admin/reports', 2000, '[data-testid=report-send-mail]');
  await shot(m, 'rad-10-izvestaj-slanje', [{ sel: '[data-testid=report-send-mail]' }, { sel: '[data-testid=report-send-whatsapp]' }, { sel: '[data-testid=report-scope-mine]' }], { scroll: false });

  const w = await ctxFor();
  await quickLogin(w, LOGIN.worker, /admin/);
  await openMenu(w);
  await shot(w, 'radnik-01-meni', [{ sel: '[data-testid=admin-sidebar] nav' }], { scroll: false });
  await closeModal(w);
  await go(w, '/admin/dashboard', 2500, '[data-testid=dashboard-my-cash]');
  await shot(w, 'radnik-02-pregled', [{ sel: '[data-testid=dashboard-today]' }, { sel: '[data-testid^=complete-]' }], { scroll: false });
  await shot(w, 'radnik-03-moj-pazar', [{ sel: '[data-testid=dashboard-my-cash]' }]);
  await go(w, '/admin/calendar', 2500, '[data-testid=calendar-grid]');
  await shot(w, 'radnik-04-kalendar', [{ sel: '[data-testid=calendar-staff]' }, { sel: '[data-testid=calendar-new]' }], { scroll: false });

  const a = await ctxFor();
  await go(a, '/', 2500);
  await shot(a, 'klijent-01-pocetna', [{ sel: '[data-testid=home-book]' }, { sel: '[data-testid=home-register]' }], { scroll: false });
  await a.click('[data-testid=home-book]');
  await a.waitForTimeout(600);
  await shot(a, 'klijent-02-izbor', [{ sel: '[data-testid=home-modal-register]' }], { scroll: false });
  await closeModal(a);
  await go(a, '/register', 1200);
  await shot(a, 'klijent-03-registracija', [{ sel: '[data-testid=register-first-name]' }, { sel: '[data-testid=register-submit]' }], { full: true, scroll: false });
  await go(a, '/login', 1000);
  await shot(a, 'prijava-01-prijava', [{ sel: '[data-testid=login-forgot]' }, { sel: '[data-testid=login-register]' }], { scroll: false });
  await go(a, '/forgot-password', 1000);
  await shot(a, 'prijava-02-zaboravljena', [{ sel: '[data-testid=forgot-email]' }, { sel: '[data-testid=forgot-submit]' }], { scroll: false });
  await go(a, '/verify-email', 1500);
  await shot(a, 'prijava-03-aktivacija', [{ sel: '[data-testid=verify-resend-email]' }, { sel: '[data-testid=verify-resend]' }], { scroll: false });

  const c = await ctxFor();
  await quickLogin(c, LOGIN.client, /my-appointments|book|\/$/);
  await c.evaluate(() => sessionStorage.clear());
  await go(c, '/book?kod=INSTA10', 2500, '[data-testid^=book-service-]');
  await shot(c, 'klijent-04b-pauza', [{ sel: '[data-testid^=book-service-paused-]' }]);
  await c.evaluate(() => window.scrollTo(0, 0));
  const pick = await c.evaluate(() => {
    const el = [...document.querySelectorAll('[data-testid^=book-service-]')].find((e) => /^book-service-\d+$/.test(e.dataset.testid) && !e.querySelector('[data-testid^=book-service-paused-]') && !e.disabled);
    el?.scrollIntoView({ block: 'center' });
    el?.click();
    return !!el;
  });
  if (!pick) console.log('NEMA USLUGE ZA IZBOR');
  await c.waitForTimeout(400);
  await shot(c, 'klijent-04-usluga', [{ sel: '[data-testid^=book-service-].selected' }, { sel: '[data-testid=book-next]' }], { scroll: false });
  await c.click('[data-testid=book-next]');
  await c.waitForTimeout(1200);
  await shot(c, 'klijent-05-frizer', [{ sel: '[data-testid^=book-staff-]' }], { scroll: false });
  await c.locator('[data-testid^=book-staff-]').first().click();
  await c.waitForTimeout(300);
  await c.click('[data-testid=book-next]').catch(() => {});
  await c.waitForTimeout(2000);
  await c.locator('[data-testid^=book-day-]:not([disabled]):not(.full)').first().click();
  await c.waitForTimeout(1500);
  await c.locator('[data-testid^=book-slot-]').first().click();
  await c.waitForTimeout(300);
  await shot(c, 'klijent-06-termin', [{ sel: '.day-pill.selected' }, { sel: '.slot.selected' }], { scroll: false });
  await c.click('[data-testid=book-next]');
  await c.waitForTimeout(2000);
  await shot(c, 'klijent-07-potvrda', [{ sel: '[data-testid=book-code]' }, { sel: '[data-testid=book-submit]' }]);
  await c.click('[data-testid=book-submit]');
  await c.waitForSelector('[data-testid=booking-success]', { timeout: 15000 }).catch(() => console.log('ZAKAZIVANJE NIJE USPELO'));
  await c.evaluate(() => sessionStorage.clear());
  await go(c, '/my-appointments', 2500, '[data-testid^=my-reschedule-]');
  await shot(c, 'klijent-08-moji-termini', [{ sel: '[data-testid^=my-reschedule-]' }, { sel: '[data-testid^=my-cancel-]' }]);
  await c.click('[data-testid=my-past]');
  await c.waitForTimeout(1500);
  await shot(c, 'klijent-09-prosli', [{ sel: '[data-testid=my-past]' }, { sel: '[data-testid=my-calendar]' }], { scroll: false });
  await go(c, '/profile', 1500);
  await shot(c, 'klijent-10-profil', [{ sel: '[data-testid=profile-favorite]' }]);
}
