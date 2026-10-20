import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = dirname(fileURLToPath(import.meta.url));

const T = {
  bg: '#f5f5f4', surface: '#ffffff', border: '#e7e5e4', borderDark: '#d6d3d1',
  text: '#1c1917', muted: '#78716c',
  primary: '#0f766e', primaryDark: '#115e59', primaryTint: '#ccfbf1', onPrimary: '#ffffff',
  danger: '#c0392b', dangerTint: '#fde2e1',
  warning: '#b7791f', warningTint: '#fdedd3',
  success: '#1e7e4a', successTint: '#e6f4ea',
  info: '#0369a1', infoTint: '#e0f2fe',
  neutral: '#333333', onNeutral: '#ffffff',
};

const BUSINESS = 'Salon Lepota';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const rect = (x, y, w, h, o = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx ?? 0}" fill="${o.fill ?? 'none'}"${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw ?? 1}"` : ''}${o.op ? ` opacity="${o.op}"` : ''}/>`;
const txt = (x, y, s, o = {}) =>
  `<text x="${x}" y="${y}" font-size="${o.size ?? 14}" font-weight="${o.weight ?? 400}" fill="${o.fill ?? T.text}"${o.anchor ? ` text-anchor="${o.anchor}"` : ''}>${esc(s)}</text>`;
const line = (x1, y1, x2, y2, c = T.border) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}"/>`;
const tw = (s, size = 14, weight = 400) => Math.round(String(s).length * size * (weight >= 600 ? 0.57 : 0.53));
const group = (name, inner) => `<g id="${esc(name)}">${inner}</g>`;

const ICONS = {
  plus: (x, y, c) => `<path d="M${x + 6} ${y + 1}v10M${x + 1} ${y + 6}h10" stroke="${c}" stroke-width="1.8"/>`,
  check: (x, y, c) => `<path d="M${x + 1} ${y + 6}l3.5 3.5l6.5-7" fill="none" stroke="${c}" stroke-width="1.8"/>`,
  close: (x, y, c) => `<path d="M${x + 2} ${y + 2}l8 8M${x + 10} ${y + 2}l-8 8" stroke="${c}" stroke-width="1.6"/>`,
  menu: (x, y, c) => `<path d="M${x} ${y + 2}h12M${x} ${y + 6}h12M${x} ${y + 10}h12" stroke="${c}" stroke-width="1.6"/>`,
  user: (x, y, c) => `<circle cx="${x + 6}" cy="${y + 4}" r="2.5" fill="none" stroke="${c}" stroke-width="1.5"/><path d="M${x + 1} ${y + 11}q5-7 10 0" fill="none" stroke="${c}" stroke-width="1.5"/>`,
  calendar: (x, y, c) => `<rect x="${x + 1}" y="${y + 2}" width="10" height="9" rx="1.5" fill="none" stroke="${c}" stroke-width="1.5"/><path d="M${x + 1} ${y + 5}h10" stroke="${c}" stroke-width="1.5"/>`,
  clock: (x, y, c) => `<circle cx="${x + 6}" cy="${y + 6}" r="5.5" fill="none" stroke="${c}" stroke-width="1.5"/><path d="M${x + 6} ${y + 3}v3.2l2.2 1.4" fill="none" stroke="${c}" stroke-width="1.5"/>`,
  phone: (x, y, c) => `<path d="M${x + 2} ${y + 1}h2.5l1 3l-1.5 1q1 2.5 3.5 3.5l1-1.5l3 1v2.5q-6 .5-9.5-4q-1.5-2.5 0-5.5z" fill="none" stroke="${c}" stroke-width="1.3" stroke-linejoin="round"/>`,
  pin: (x, y, c) => `<path d="M${x + 6} ${y + 11.5}q-4.5-4.5-4.5-6.5a4.5 4.5 0 0 1 9 0q0 2-4.5 6.5z" fill="none" stroke="${c}" stroke-width="1.4"/><circle cx="${x + 6}" cy="${y + 5}" r="1.4" fill="${c}"/>`,
  home: (x, y, c) => `<path d="M${x + 1} ${y + 6}l5-4.5l5 4.5v5.5h-10z" fill="none" stroke="${c}" stroke-width="1.5" stroke-linejoin="round"/>`,
  list: (x, y, c) => `<path d="M${x + 3} ${y + 2}h9M${x + 3} ${y + 6}h9M${x + 3} ${y + 10}h9" stroke="${c}" stroke-width="1.5"/><circle cx="${x}" cy="${y + 2}" r="1" fill="${c}"/><circle cx="${x}" cy="${y + 6}" r="1" fill="${c}"/><circle cx="${x}" cy="${y + 10}" r="1" fill="${c}"/>`,
  sliders: (x, y, c) => `<path d="M${x} ${y + 3}h12M${x} ${y + 9}h12" stroke="${c}" stroke-width="1.4"/><circle cx="${x + 4}" cy="${y + 3}" r="1.8" fill="${T.surface}" stroke="${c}" stroke-width="1.4"/><circle cx="${x + 8}" cy="${y + 9}" r="1.8" fill="${T.surface}" stroke="${c}" stroke-width="1.4"/>`,
  scissors: (x, y, c) => `<circle cx="${x + 3}" cy="${y + 9}" r="2.2" fill="none" stroke="${c}" stroke-width="1.4"/><circle cx="${x + 9}" cy="${y + 9}" r="2.2" fill="none" stroke="${c}" stroke-width="1.4"/><path d="M${x + 4.5} ${y + 7.5}l5-7M${x + 7.5} ${y + 7.5}l-5-7" stroke="${c}" stroke-width="1.4"/>`,
  users: (x, y, c) => ICONS.user(x, y, c),
  more: (x, y, c) => `<circle cx="${x + 6}" cy="${y + 2}" r="1.3" fill="${c}"/><circle cx="${x + 6}" cy="${y + 6}" r="1.3" fill="${c}"/><circle cx="${x + 6}" cy="${y + 10}" r="1.3" fill="${c}"/>`,
  chevronLeft: (x, y, c) => `<path d="M${x + 8} ${y + 1}l-5 5l5 5" fill="none" stroke="${c}" stroke-width="1.8"/>`,
  chevronRight: (x, y, c) => `<path d="M${x + 4} ${y + 1}l5 5l-5 5" fill="none" stroke="${c}" stroke-width="1.8"/>`,
  chevronDown: (x, y, c) => `<path d="M${x + 1} ${y + 4}l5 5l5-5" fill="none" stroke="${c}" stroke-width="1.6"/>`,
  image: (x, y, c) => `<rect x="${x + 1}" y="${y + 1}" width="10" height="10" rx="1.5" fill="none" stroke="${c}" stroke-width="1.5"/><circle cx="${x + 4}" cy="${y + 4.5}" r="1" fill="${c}"/>`,
  instagram: (x, y, c) => `<rect x="${x + 1}" y="${y + 1}" width="10" height="10" rx="3" fill="none" stroke="${c}" stroke-width="1.4"/><circle cx="${x + 6}" cy="${y + 6}" r="2.3" fill="none" stroke="${c}" stroke-width="1.4"/>`,
  logout: (x, y, c) => `<path d="M${x + 5} ${y + 1}h-4v10h4M${x + 4} ${y + 6}h7M${x + 8} ${y + 3}l3 3l-3 3" fill="none" stroke="${c}" stroke-width="1.5"/>`,
  search: (x, y, c) => `<circle cx="${x + 5}" cy="${y + 5}" r="4" fill="none" stroke="${c}" stroke-width="1.5"/><path d="M${x + 8} ${y + 8}l3.5 3.5" stroke="${c}" stroke-width="1.5"/>`,
  edit: (x, y, c) => `<path d="M${x + 1} ${y + 11}l1-3l7-7l2 2l-7 7z" fill="none" stroke="${c}" stroke-width="1.5" stroke-linejoin="round"/>`,
  trash: (x, y, c) => `<path d="M${x + 1} ${y + 3}h10M${x + 4} ${y + 3}v-2h4v2M${x + 2} ${y + 3}l1 8h6l1-8" fill="none" stroke="${c}" stroke-width="1.5" stroke-linejoin="round"/>`,
  lock: (x, y, c) => `<rect x="${x + 1.5}" y="${y + 5}" width="9" height="6.5" rx="1.5" fill="none" stroke="${c}" stroke-width="1.5"/><path d="M${x + 3.5} ${y + 5}v-1.5a2.5 2.5 0 0 1 5 0v1.5" fill="none" stroke="${c}" stroke-width="1.5"/>`,
  mail: (x, y, c) => `<rect x="${x}" y="${y + 2}" width="12" height="8.5" rx="1.5" fill="none" stroke="${c}" stroke-width="1.4"/><path d="M${x} ${y + 3}l6 4l6-4" fill="none" stroke="${c}" stroke-width="1.4"/>`,
};
const icon = (n, x, y, c = T.text) => (ICONS[n] ?? ICONS.image)(x, y, c);

const THEMES = {
  primary: { fill: T.primary, stroke: T.primary, color: T.onPrimary },
  neutral: { fill: T.neutral, stroke: T.neutral, color: T.onNeutral },
  secondary: { fill: T.surface, stroke: T.borderDark, color: T.text },
  ghost: { fill: 'none', stroke: 'none', color: T.text },
  danger: { fill: T.danger, stroke: T.danger, color: '#fff' },
  dangerOutline: { fill: T.surface, stroke: T.danger, color: T.danger },
};

function button(x, y, label, { theme = 'primary', size = 'm', ic, w, disabled } = {}) {
  const t = THEMES[theme];
  const h = size === 's' ? 32 : size === 'l' ? 52 : 44;
  const fs = size === 's' ? 13 : size === 'l' ? 16 : 14;
  const iw = ic ? 20 : 0;
  const bw = w ?? (label ? tw(label, fs, 600) + iw + (size === 's' ? 22 : 36) : h);
  const contentW = label ? tw(label, fs, 600) + iw : 12;
  const sx = x + (bw - contentW) / 2;
  const inner =
    (ic ? icon(ic, sx, y + h / 2 - 6, t.color) : '') +
    (label ? txt(sx + iw, y + h / 2 + fs / 3, label, { size: fs, weight: 600, fill: t.color }) : '');
  return { w: bw, h, svg: `<g opacity="${disabled ? 0.5 : 1}">${rect(x, y, bw, h, { rx: 8, fill: t.fill, stroke: t.stroke })}${inner}</g>` };
}
const iconBtn = (x, y, ic, theme = 'secondary') => button(x, y, '', { theme, size: 's', ic, w: 32 });

function badge(x, y, label, kind = 'neutral') {
  const m = {
    success: [T.successTint, T.success], danger: [T.dangerTint, T.danger], warning: [T.warningTint, T.warning],
    info: [T.infoTint, T.info], primary: [T.primaryTint, T.primary], neutral: [T.bg, T.muted],
  }[kind];
  const w = tw(label, 12, 600) + 18;
  return { w, svg: rect(x, y, w, 22, { rx: 11, fill: m[0] }) + txt(x + w / 2, y + 15, label, { size: 12, weight: 600, fill: m[1], anchor: 'middle' }) };
}

function input(x, y, w, label, value = '', { placeholder, error, suffix } = {}) {
  const iy = y + (label ? 22 : 0);
  return (
    (label ? txt(x, y + 13, label, { size: 13, weight: 600, fill: T.muted }) : '') +
    rect(x, iy, w, 44, { rx: 8, fill: T.surface, stroke: error ? T.danger : T.borderDark }) +
    txt(x + 12, iy + 27, value || placeholder || '', { size: 15, fill: value ? T.text : T.muted }) +
    (suffix ? icon(suffix, x + w - 26, iy + 16, T.muted) : '') +
    (error ? txt(x, iy + 62, error, { size: 12.5, fill: T.danger }) : '')
  );
}
const select = (x, y, w, label, value) => input(x, y, w, label, value, { suffix: 'chevronDown' });
const checkbox = (x, y, label, on = false) =>
  rect(x, y, 18, 18, { rx: 4, fill: on ? T.primary : T.surface, stroke: on ? T.primary : T.borderDark }) +
  (on ? icon('check', x + 3, y + 3, T.onPrimary) : '') + txt(x + 28, y + 14, label, { size: 14 });

function segmented(x, y, options, active, { w } = {}) {
  const h = 38;
  const total = w ?? options.reduce((a, o) => a + tw(o, 13, 600) + 28, 0) + 6;
  const each = (total - 6) / options.length;
  let out = rect(x, y, total, h, { rx: h / 2, fill: T.bg, stroke: T.border });
  options.forEach((o, i) => {
    const cx = x + 3 + i * each;
    if (i === active) out += rect(cx, y + 3, each, h - 6, { rx: (h - 6) / 2, fill: T.surface, stroke: T.border });
    out += txt(cx + each / 2, y + h / 2 + 4.5, o, { size: 13, weight: 600, fill: i === active ? T.text : T.muted, anchor: 'middle' });
  });
  return { w: total, svg: out };
}

const card = (x, y, w, h, o = {}) => rect(x, y, w, h, { rx: 10, fill: T.surface, stroke: o.selected ? T.primary : T.border, sw: o.selected ? 2 : 1 });
const avatar = (cx, cy, r = 20, initials) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${T.primaryTint}"/>` +
  (initials ? txt(cx, cy + r * 0.3, initials, { size: r * 0.8, weight: 600, fill: T.primary, anchor: 'middle' }) : icon('user', cx - 6, cy - 6, T.primary));
const logo = (x, y, s = 40) =>
  rect(x, y, s, s, { rx: s / 4, fill: T.primary }) +
  `<g transform="translate(${x + s / 2} ${y + s / 2}) scale(${(s / 26).toFixed(2)}) translate(-6 -6)">${icon('scissors', 0, 0, T.onPrimary)}</g>`;

const SERVICES = [
  ['Žensko šišanje', '45 min', '2.500 din.'],
  ['Muško šišanje', '30 min', '1.500 din.'],
  ['Feniranje', '30 min', '1.200 din.'],
  ['Farbanje', '90 min', '4.500 din.'],
  ['Manikir', '60 min', '2.000 din.'],
];

const MW = 390, MH = 844, PAD = 16, CWm = MW - PAD * 2;

function statusBar() {
  return txt(PAD + 8, 30, '9:41', { size: 14, weight: 600 }) + rect(MW - 50, 20, 26, 12, { rx: 3, stroke: T.text }) + rect(MW - 48, 22, 18, 8, { rx: 2, fill: T.text });
}

function mobileHeader({ back, title, user = false, admin = false } = {}) {
  let out = rect(0, 0, MW, 100, { fill: T.surface }) + statusBar() + line(0, 100, MW, 100);
  if (back) {
    out += icon('chevronLeft', PAD, 66, T.text) + txt(PAD + 22, 78, title, { size: 17, weight: 600 });
  } else if (admin) {
    out += icon('menu', PAD, 66, T.text) + txt(PAD + 26, 78, title ?? BUSINESS, { size: 17, weight: 700 });
    out += avatar(MW - PAD - 18, 72, 18, 'AZ');
  } else {
    out += logo(PAD, 54, 36) + txt(PAD + 46, 78, BUSINESS, { size: 17, weight: 700 });
    out += user ? avatar(MW - PAD - 18, 72, 18, 'MM') : button(MW - PAD - 82, 56, 'Prijava', { theme: 'secondary', size: 's', w: 82 }).svg;
  }
  return out;
}

function bottomNav(active) {
  const items = [['home', 'Početna'], ['calendar', 'Zakaži'], ['list', 'Moji termini'], ['user', 'Profil']];
  const y = MH - 84;
  let out = rect(0, y, MW, 84, { fill: T.surface }) + line(0, y, MW, y);
  const each = MW / items.length;
  items.forEach(([ic, l], i) => {
    const cx = each * i + each / 2;
    const c = i === active ? T.primary : T.muted;
    out += icon(ic, cx - 6, y + 14, c) + txt(cx, y + 44, l, { size: 11.5, weight: i === active ? 600 : 400, fill: c, anchor: 'middle' });
  });
  out += rect(MW / 2 - 67, MH - 12, 134, 5, { rx: 3, fill: T.text });
  return out;
}

function mobile(name, body, { nav, header = {} } = {}) {
  let out = rect(0, 0, MW, MH, { fill: T.bg }) + body + mobileHeader(header);
  if (nav !== undefined) out += bottomNav(nav);
  return { W: MW, H: MH, svg: group(name, out) };
}

function stepper(y, step) {
  const labels = ['Usluga', 'Zaposleni', 'Termin', 'Potvrda'];
  let out = '';
  const each = CWm / 4;
  labels.forEach((l, i) => {
    const x = PAD + i * each;
    const done = i < step, cur = i === step;
    out += rect(x, y, each - 6, 4, { rx: 2, fill: done || cur ? T.primary : T.border });
    out += txt(x, y + 22, `${i + 1}. ${l}`, { size: 12, weight: cur ? 600 : 400, fill: cur ? T.primary : T.muted });
  });
  return out;
}

function bookingFooter(summary, label, disabled) {
  const y = MH - 112;
  return rect(0, y, MW, 112, { fill: T.surface }) + line(0, y, MW, y) +
    txt(PAD, y + 26, summary, { size: 13, fill: T.muted }) +
    button(PAD, y + 40, label, { w: CWm, size: 'l', disabled }).svg +
    rect(MW / 2 - 67, MH - 12, 134, 5, { rx: 3, fill: T.text });
}

function home() {
  let y = 116, b = '';
  b += rect(PAD, y, CWm, 168, { rx: 14, fill: T.primary });
  b += txt(PAD + 20, y + 44, 'Zakaži termin za', { size: 15, fill: T.primaryTint });
  b += txt(PAD + 20, y + 74, 'manje od minut', { size: 24, weight: 700, fill: T.onPrimary });
  b += txt(PAD + 20, y + 100, 'Bez poziva, i van radnog vremena.', { size: 13.5, fill: T.primaryTint });
  b += rect(PAD + 20, y + 116, 150, 40, { rx: 8, fill: T.surface }) + txt(PAD + 95, y + 141, 'Zakaži termin', { size: 14, weight: 600, fill: T.primary, anchor: 'middle' });
  y += 192;
  b += txt(PAD, y, 'Usluge', { size: 18, weight: 600 }) + txt(MW - PAD, y, 'Sve', { size: 14, weight: 600, fill: T.primary, anchor: 'end' });
  y += 14;
  b += card(PAD, y, CWm, 4 * 60);
  SERVICES.slice(0, 4).forEach(([n, d, p], i) => {
    const ry = y + i * 60;
    if (i) b += line(PAD + 16, ry, MW - PAD, ry);
    b += txt(PAD + 16, ry + 26, n, { size: 15, weight: 600 }) + icon('clock', PAD + 16, ry + 36, T.muted) + txt(PAD + 34, ry + 46, d, { size: 13, fill: T.muted });
    b += txt(MW - PAD - 16, ry + 36, p, { size: 15, weight: 600, anchor: 'end' });
  });
  y += 264;
  b += txt(PAD, y, 'Radno vreme i kontakt', { size: 18, weight: 600 });
  y += 14;
  b += card(PAD, y, CWm, 148);
  [['Pon – Pet', '09:00 – 20:00'], ['Subota', '09:00 – 15:00'], ['Nedelja', 'zatvoreno']].forEach(([d, h], i) => {
    b += txt(PAD + 16, y + 28 + i * 24, d, { size: 14, fill: T.muted }) + txt(MW - PAD - 16, y + 28 + i * 24, h, { size: 14, weight: 600, anchor: 'end', fill: h === 'zatvoreno' ? T.muted : T.text });
  });
  b += line(PAD + 16, y + 98, MW - PAD - 16, y + 98);
  b += icon('pin', PAD + 16, y + 112, T.primary) + txt(PAD + 36, y + 122, 'Glavna 1, Beograd', { size: 14 });
  b += icon('phone', MW / 2 + 30, y + 112, T.primary) + txt(MW / 2 + 50, y + 122, '060 123 4567', { size: 14 });
  return mobile('Početna', b, { nav: 0 });
}

function bookService() {
  let y = 116, b = stepper(y, 0);
  y += 62;
  b += txt(PAD, y, 'Izaberi uslugu', { size: 20, weight: 600 });
  y += 16;
  SERVICES.forEach(([n, d, p], i) => {
    const sel = i === 0;
    b += card(PAD, y, CWm, 72, { selected: sel });
    b += txt(PAD + 16, y + 30, n, { size: 15, weight: 600 }) + icon('clock', PAD + 16, y + 42, T.muted) + txt(PAD + 34, y + 52, d, { size: 13, fill: T.muted });
    b += txt(MW - PAD - 52, y + 42, p, { size: 15, weight: 600, anchor: 'end' });
    b += `<circle cx="${MW - PAD - 26}" cy="${y + 36}" r="10" fill="${sel ? T.primary : T.surface}" stroke="${sel ? T.primary : T.borderDark}"/>` + (sel ? icon('check', MW - PAD - 32, y + 30, T.onPrimary) : '');
    y += 82;
  });
  b += bookingFooter('Žensko šišanje · 45 min · 2.500 din.', 'Dalje');
  return mobile('Zakazivanje 1 — usluga', b, { header: { back: true, title: 'Zakazivanje' } });
}

function bookStaff() {
  let y = 116, b = stepper(y, 1);
  y += 62;
  b += txt(PAD, y, 'Kod koga?', { size: 20, weight: 600 });
  y += 16;
  const staff = [['Bilo ko', 'Prvi slobodan termin', null], ['Ana Jovanović', 'Frizer', 'AJ'], ['Milica Petrović', 'Frizer, kolorista', 'MP'], ['Jelena Ilić', 'Manikir', 'JI']];
  staff.forEach(([n, r, ini], i) => {
    const sel = i === 1;
    b += card(PAD, y, CWm, 76, { selected: sel });
    b += ini ? avatar(PAD + 38, y + 38, 22, ini) : `<circle cx="${PAD + 38}" cy="${y + 38}" r="22" fill="${T.bg}" stroke="${T.border}"/>` + icon('users', PAD + 32, y + 32, T.muted);
    b += txt(PAD + 72, y + 34, n, { size: 15, weight: 600 }) + txt(PAD + 72, y + 54, r, { size: 13, fill: T.muted });
    b += `<circle cx="${MW - PAD - 26}" cy="${y + 38}" r="10" fill="${sel ? T.primary : T.surface}" stroke="${sel ? T.primary : T.borderDark}"/>` + (sel ? icon('check', MW - PAD - 32, y + 32, T.onPrimary) : '');
    y += 86;
  });
  b += bookingFooter('Žensko šišanje · Ana Jovanović', 'Dalje');
  return mobile('Zakazivanje 2 — zaposleni', b, { header: { back: true, title: 'Zakazivanje' } });
}

function bookTime() {
  let y = 116, b = stepper(y, 2);
  y += 62;
  b += txt(PAD, y, 'Izaberi termin', { size: 20, weight: 600 });
  y += 12;
  b += icon('chevronLeft', PAD, y + 8, T.muted) + txt(MW / 2, y + 18, 'Oktobar 2026', { size: 14, weight: 600, anchor: 'middle' }) + icon('chevronRight', MW - PAD - 12, y + 8, T.text);
  y += 34;
  const days = [['Uto', '20'], ['Sre', '21'], ['Čet', '22'], ['Pet', '23'], ['Sub', '24'], ['Ned', '25']];
  const dw = (CWm - 5 * 8) / 6;
  days.forEach(([d, n], i) => {
    const x = PAD + i * (dw + 8);
    const sel = i === 2, off = d === 'Ned';
    b += rect(x, y, dw, 64, { rx: 10, fill: sel ? T.primary : T.surface, stroke: sel ? T.primary : T.border });
    b += txt(x + dw / 2, y + 24, d, { size: 12, fill: sel ? T.primaryTint : T.muted, anchor: 'middle' });
    b += txt(x + dw / 2, y + 48, n, { size: 18, weight: 700, fill: sel ? T.onPrimary : off ? T.borderDark : T.text, anchor: 'middle' });
  });
  y += 88;
  const slots = {
    'Pre podne': ['09:00', '09:45', '10:30', '11:15'],
    'Popodne': ['13:00', '13:45', '15:15', '16:00', '16:45', '17:30'],
    'Uveče': ['18:15', '19:00'],
  };
  const sw = (CWm - 3 * 8) / 4;
  Object.entries(slots).forEach(([label, list]) => {
    b += txt(PAD, y, label, { size: 13, weight: 600, fill: T.muted });
    y += 12;
    list.forEach((s, i) => {
      const x = PAD + (i % 4) * (sw + 8), ry = y + Math.floor(i / 4) * 50;
      const sel = s === '15:15', taken = s === '13:45';
      b += rect(x, ry, sw, 40, { rx: 8, fill: sel ? T.primary : T.surface, stroke: sel ? T.primary : T.borderDark });
      b += txt(x + sw / 2, ry + 25, s, { size: 15, weight: 600, fill: sel ? T.onPrimary : taken ? T.borderDark : T.text, anchor: 'middle' });
    });
    y += Math.ceil(list.length / 4) * 50 + 20;
  });
  b += bookingFooter('Čet 22.10. u 15:15 · Ana · 45 min', 'Dalje');
  return mobile('Zakazivanje 3 — termin', b, { header: { back: true, title: 'Zakazivanje' } });
}

function bookConfirm() {
  let y = 116, b = stepper(y, 3);
  y += 62;
  b += txt(PAD, y, 'Proveri i potvrdi', { size: 20, weight: 600 });
  y += 16;
  b += card(PAD, y, CWm, 196);
  [['scissors', 'Žensko šišanje', '45 min'], ['user', 'Ana Jovanović', 'Frizer'], ['calendar', 'Četvrtak, 22.10.2026', '15:15 – 16:00']].forEach(([ic, a, s], i) => {
    const ry = y + 18 + i * 46;
    b += rect(PAD + 16, ry, 32, 32, { rx: 8, fill: T.primaryTint }) + icon(ic, PAD + 26, ry + 10, T.primary);
    b += txt(PAD + 60, ry + 14, a, { size: 15, weight: 600 }) + txt(PAD + 60, ry + 31, s, { size: 13, fill: T.muted });
  });
  b += line(PAD + 16, y + 156, MW - PAD - 16, y + 156);
  b += txt(PAD + 16, y + 182, 'Cena', { size: 14, fill: T.muted }) + txt(MW - PAD - 16, y + 182, '2.500 din.', { size: 16, weight: 700, anchor: 'end' });
  y += 212;
  b += segmented(PAD, y, ['Imam nalog', 'Nastavi kao gost'], 1, { w: CWm }).svg;
  y += 56;
  b += input(PAD, y, CWm, 'Ime i prezime', 'Marija Marković');
  y += 80;
  b += input(PAD, y, CWm, 'Telefon', '064 111 2222');
  y += 80;
  b += input(PAD, y, CWm, 'Napomena (opciono)', '', { placeholder: 'npr. alergija na...' });
  b += bookingFooter('Potvrdu dobijaš mejlom ili WhatsApp-om', 'Zakaži termin');
  return mobile('Zakazivanje 4 — potvrda', b, { header: { back: true, title: 'Zakazivanje' } });
}

function booked() {
  let b = '';
  const cy = 290;
  b += `<circle cx="${MW / 2}" cy="${cy}" r="44" fill="${T.successTint}"/>` + `<path d="M${MW / 2 - 18} ${cy}l12 12l24-26" fill="none" stroke="${T.success}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
  b += txt(MW / 2, cy + 86, 'Termin je zakazan', { size: 22, weight: 700, anchor: 'middle' });
  b += txt(MW / 2, cy + 114, 'Salon će potvrditi termin, a ti ćeš', { size: 14, fill: T.muted, anchor: 'middle' });
  b += txt(MW / 2, cy + 134, 'dobiti obaveštenje.', { size: 14, fill: T.muted, anchor: 'middle' });
  const y = cy + 164;
  b += card(PAD, y, CWm, 96) + txt(PAD + 16, y + 30, 'Četvrtak, 22.10.2026 · 15:15', { size: 15, weight: 600 });
  b += txt(PAD + 16, y + 52, 'Žensko šišanje · Ana Jovanović', { size: 13.5, fill: T.muted }) + badge(PAD + 16, y + 62, 'Na čekanju', 'warning').svg;
  b += button(PAD, y + 120, 'Moji termini', { w: CWm, size: 'l' }).svg;
  b += button(PAD, y + 182, 'Dodaj u kalendar', { w: CWm, size: 'l', theme: 'secondary', ic: 'calendar' }).svg;
  return mobile('Zakazano', b, { header: { back: true, title: 'Zakazivanje' } });
}

function authScreen(name, title, subtitle, fields, primary, links) {
  let y = fields.length > 3 ? 128 : 176, b = '';
  b += logo(MW / 2 - 32, y, 64);
  y += 104;
  b += txt(MW / 2, y, title, { size: 24, weight: 700, anchor: 'middle' });
  if (subtitle) b += txt(MW / 2, y + 26, subtitle, { size: 14, fill: T.muted, anchor: 'middle' });
  y += subtitle ? 52 : 28;
  fields.forEach((f) => {
    if (f.check) { b += checkbox(PAD, y, f.check, true); y += 36; return; }
    if (f.row) {
      const hw = (CWm - 12) / 2;
      b += input(PAD, y, hw, f.row[0][0], f.row[0][1]) + input(PAD + hw + 12, y, hw, f.row[1][0], f.row[1][1]);
    } else if (f.select) b += select(PAD, y, CWm, f.label, f.value);
    else b += input(PAD, y, CWm, f.label, f.value, { suffix: f.suffix, placeholder: f.placeholder });
    y += 80;
  });
  y += 4;
  b += button(PAD, y, primary, { w: CWm, size: 'l' }).svg;
  y += 80;
  links.forEach((l) => { b += txt(MW / 2, y, l, { size: 14, weight: 600, fill: T.primary, anchor: 'middle' }); y += 28; });
  return mobile(name, b, { header: { back: true, title: '' } });
}

function myAppointments() {
  let y = 116, b = '';
  b += txt(PAD, y + 18, 'Moji termini', { size: 22, weight: 700 });
  y += 36;
  b += segmented(PAD, y, ['Predstojeći', 'Prošli'], 0, { w: CWm }).svg;
  y += 56;
  const items = [
    ['Čet', '22', 'OKT', 'Žensko šišanje', '15:15 · Ana Jovanović', 'Na čekanju', 'warning', true],
    ['Pet', '06', 'NOV', 'Farbanje', '10:00 · Milica Petrović', 'Potvrđen', 'success', true],
  ];
  items.forEach(([d, n, m, s, info, st, kind, cancel]) => {
    b += card(PAD, y, CWm, 132);
    b += rect(PAD + 16, y + 16, 56, 64, { rx: 10, fill: T.primaryTint });
    b += txt(PAD + 44, y + 34, d, { size: 12, fill: T.primary, anchor: 'middle' }) + txt(PAD + 44, y + 58, n, { size: 22, weight: 700, fill: T.primary, anchor: 'middle' }) + txt(PAD + 44, y + 74, m, { size: 10.5, weight: 600, fill: T.primary, anchor: 'middle' });
    b += txt(PAD + 86, y + 36, s, { size: 16, weight: 600 }) + txt(PAD + 86, y + 56, info, { size: 13.5, fill: T.muted }) + badge(PAD + 86, y + 64, st, kind).svg;
    b += line(PAD + 16, y + 94, MW - PAD - 16, y + 94);
    if (cancel) b += txt(PAD + 16, y + 118, 'Otkaži termin', { size: 14, weight: 600, fill: T.danger });
    b += txt(MW - PAD - 16, y + 118, '2.500 din.', { size: 14, weight: 600, anchor: 'end' });
    y += 148;
  });
  b += rect(PAD, y, CWm, 64, { rx: 10, fill: T.infoTint });
  b += txt(PAD + 16, y + 27, 'Otkazivanje je moguće najkasnije', { size: 13.5, fill: T.info });
  b += txt(PAD + 16, y + 46, '24 sata pre termina.', { size: 13.5, fill: T.info });
  return mobile('Moji termini', b, { nav: 2, header: { user: true } });
}

function profile() {
  let y = 124, b = '';
  b += avatar(MW / 2, y + 40, 40, 'MM');
  b += txt(MW / 2, y + 108, 'Marija Marković', { size: 20, weight: 700, anchor: 'middle' }) + txt(MW / 2, y + 130, 'marija@example.com', { size: 14, fill: T.muted, anchor: 'middle' });
  y += 156;
  b += card(PAD, y, CWm, 340) + txt(PAD + 16, y + 30, 'Lični podaci', { size: 16, weight: 600 });
  const hw = (CWm - 32 - 12) / 2;
  b += input(PAD + 16, y + 46, hw, 'Ime', 'Marija') + input(PAD + 16 + hw + 12, y + 46, hw, 'Prezime', 'Marković');
  b += input(PAD + 16, y + 126, CWm - 32, 'Telefon', '064 111 2222');
  b += select(PAD + 16, y + 206, CWm - 32, 'Obaveštenja preko', 'WhatsApp');
  b += button(MW - PAD - 16 - 100, y + 288, 'Sačuvaj', { size: 's', w: 100 }).svg;
  y += 356;
  b += card(PAD, y, CWm, 112);
  b += icon('lock', PAD + 16, y + 22, T.text) + txt(PAD + 38, y + 33, 'Promeni lozinku', { size: 15, weight: 600 }) + icon('chevronRight', MW - PAD - 28, y + 22, T.muted);
  b += line(PAD + 16, y + 56, MW - PAD - 16, y + 56);
  b += icon('logout', PAD + 16, y + 78, T.danger) + txt(PAD + 38, y + 89, 'Odjavi se', { size: 15, weight: 600, fill: T.danger });
  return mobile('Profil', b, { nav: 3, header: { user: true } });
}

const TODAY = [
  ['09:00', '09:45', 'Jovana R.', 'Žensko šišanje', 'Ana', 'Potvrđen', 'success'],
  ['10:30', '12:00', 'Sanja K.', 'Farbanje', 'Milica', 'Potvrđen', 'success'],
  ['12:00', '13:00', 'Ivana M.', 'Manikir', 'Jelena', 'Na čekanju', 'warning'],
  ['15:15', '16:00', 'Marija M.', 'Žensko šišanje', 'Ana', 'Na čekanju', 'warning'],
  ['17:30', '18:00', 'Petar S.', 'Muško šišanje', 'Ana', 'Potvrđen', 'success'],
];

function adminTodayMobile() {
  let y = 116, b = '';
  b += txt(PAD, y + 18, 'Danas', { size: 22, weight: 700 }) + txt(PAD, y + 40, 'Utorak, 20.10.2026', { size: 14, fill: T.muted });
  y += 58;
  const sw = (CWm - 16) / 3;
  [['8', 'termina'], ['2', 'na čekanju'], ['18.400', 'din.']].forEach(([n, l], i) => {
    const x = PAD + i * (sw + 8);
    b += card(x, y, sw, 72) + txt(x + 14, y + 34, n, { size: 22, weight: 700, fill: i === 1 ? T.warning : T.text }) + txt(x + 14, y + 56, l, { size: 12.5, fill: T.muted });
  });
  y += 92;
  b += txt(PAD, y, 'Sledeći', { size: 13, weight: 600, fill: T.muted });
  y += 10;
  b += rect(PAD, y, CWm, 84, { rx: 10, fill: T.primary });
  b += txt(PAD + 16, y + 32, '15:15 · Marija Marković', { size: 16, weight: 600, fill: T.onPrimary }) + txt(PAD + 16, y + 56, 'Žensko šišanje · Ana', { size: 13.5, fill: T.primaryTint });
  b += rect(MW - PAD - 100, y + 26, 84, 32, { rx: 8, fill: T.surface }) + txt(MW - PAD - 58, y + 47, 'Potvrdi', { size: 13, weight: 600, fill: T.primary, anchor: 'middle' });
  y += 106;
  b += txt(PAD, y, 'Raspored', { size: 13, weight: 600, fill: T.muted });
  y += 10;
  b += card(PAD, y, CWm, TODAY.length * 64);
  TODAY.forEach(([s, e, c, svc, st, status, kind], i) => {
    const ry = y + i * 64;
    if (i) b += line(PAD + 16, ry, MW - PAD - 16, ry);
    b += txt(PAD + 16, ry + 28, s, { size: 15, weight: 700 }) + txt(PAD + 16, ry + 46, e, { size: 12.5, fill: T.muted });
    b += rect(PAD + 70, ry + 12, 3, 40, { rx: 1.5, fill: kind === 'warning' ? T.warning : T.primary });
    b += txt(PAD + 84, ry + 28, c, { size: 15, weight: 600 }) + txt(PAD + 84, ry + 46, `${svc} · ${st}`, { size: 12.5, fill: T.muted });
    b += icon('more', MW - PAD - 28, ry + 26, T.muted);
  });
  b += `<circle cx="${MW - PAD - 28}" cy="${MH - 60}" r="28" fill="${T.primary}"/>` + icon('plus', MW - PAD - 34, MH - 66, T.onPrimary);
  return mobile('Admin — Danas (telefon)', b, { header: { admin: true } });
}

function adminMenuMobile() {
  let b = rect(0, 0, MW, MH, { fill: '#000', op: 0.45 });
  const w = 300;
  b += rect(0, 0, w, MH, { fill: T.surface }) + statusBar();
  b += logo(PAD, 56, 40) + txt(PAD + 52, 74, BUSINESS, { size: 16, weight: 700 }) + txt(PAD + 52, 92, 'Administrator', { size: 12.5, fill: T.muted });
  b += line(0, 116, w, 116);
  ADMIN_NAV.forEach(([ic, l], i) => {
    const y = 132 + i * 52;
    if (i === 0) b += rect(8, y, w - 16, 44, { rx: 8, fill: T.primaryTint });
    b += icon(ic, PAD + 8, y + 16, i === 0 ? T.primary : T.text) + txt(PAD + 34, y + 27, l, { size: 15, weight: 600, fill: i === 0 ? T.primary : T.text });
  });
  b += line(0, MH - 80, w, MH - 80) + icon('logout', PAD + 8, MH - 54, T.danger) + txt(PAD + 34, MH - 43, 'Odjavi se', { size: 15, weight: 600, fill: T.danger });
  return { W: MW, H: MH, svg: group('Admin — meni (telefon)', rect(0, 0, MW, MH, { fill: T.bg }) + mobileHeader({ admin: true }) + b) };
}

const DW = 1440, DH = 900, SIDE = 248;
const ADMIN_NAV = [['home', 'Danas'], ['calendar', 'Kalendar'], ['list', 'Termini'], ['scissors', 'Usluge'], ['users', 'Zaposleni'], ['user', 'Klijenti'], ['sliders', 'Podešavanja']];

function desktop(name, active, body, { overlay = '' } = {}) {
  let out = rect(0, 0, DW, DH, { fill: T.bg });
  out += rect(0, 0, SIDE, DH, { fill: T.surface }) + line(SIDE, 0, SIDE, DH);
  out += logo(20, 20, 40) + txt(72, 38, BUSINESS, { size: 16, weight: 700 }) + txt(72, 56, 'Administrator', { size: 12.5, fill: T.muted });
  ADMIN_NAV.forEach(([ic, l], i) => {
    const y = 92 + i * 48;
    const on = l === active;
    if (on) out += rect(12, y, SIDE - 24, 40, { rx: 8, fill: T.primaryTint });
    out += icon(ic, 28, y + 14, on ? T.primary : T.text) + txt(52, y + 25, l, { size: 14.5, weight: 600, fill: on ? T.primary : T.text });
  });
  out += line(0, DH - 72, SIDE, DH - 72) + avatar(40, DH - 36, 18, 'AZ') + txt(68, DH - 40, 'Admin Zakazivanje', { size: 13.5, weight: 600 }) + txt(68, DH - 22, 'Odjavi se', { size: 12.5, fill: T.muted });
  out += body + overlay;
  return { W: DW, H: DH, svg: group(name, out) };
}

const DX = SIDE + 32, DCW = DW - SIDE - 64;

function deskHeader(title, sub, buttons = []) {
  let out = txt(DX, 64, title, { size: 26, weight: 700 }) + (sub ? txt(DX, 88, sub, { size: 14, fill: T.muted }) : '');
  let bx = DX + DCW;
  for (let i = buttons.length - 1; i >= 0; i--) {
    const [l, o] = buttons[i];
    const w = button(0, 0, l, o).w;
    bx -= w;
    out += button(bx, 44, l, o).svg;
    bx -= 10;
  }
  return out;
}

function dataTable(x, y, w, cols, rows, rowH = 56) {
  const total = cols.reduce((a, c) => a + c[1], 0);
  const xs = [];
  let cx = x;
  cols.forEach((c) => { xs.push(cx); cx += (c[1] / total) * w; });
  let out = rect(x, y, w, 44 + rows.length * rowH, { rx: 10, fill: T.surface, stroke: T.border });
  out += rect(x + 1, y + 1, w - 2, 43, { rx: 10, fill: T.bg }) + line(x, y + 44, x + w, y + 44);
  cols.forEach((c, i) => { out += txt(xs[i] + 16, y + 27, c[0], { size: 12.5, weight: 600, fill: T.muted }); });
  rows.forEach((r, ri) => {
    const ry = y + 44 + ri * rowH;
    if (ri) out += line(x, ry, x + w, ry);
    r.forEach((cell, i) => {
      if (typeof cell === 'function') out += cell(xs[i] + 16, ry, rowH);
      else out += txt(xs[i] + 16, ry + rowH / 2 + 5, cell, { size: 14, weight: i === 0 ? 600 : 400 });
    });
  });
  return out;
}
const badgeCell = (l, k) => (x, ry, rh) => badge(x, ry + (rh - 22) / 2, l, k).svg;
const moreCell = (x, ry, rh) => iconBtn(x, ry + (rh - 32) / 2, 'more', 'ghost').svg;
const personCell = (name, sub, ini) => (x, ry, rh) =>
  avatar(x + 16, ry + rh / 2, 16, ini) + txt(x + 42, ry + rh / 2 - (sub ? 2 : -5), name, { size: 14, weight: 600 }) + (sub ? txt(x + 42, ry + rh / 2 + 15, sub, { size: 12.5, fill: T.muted }) : '');

function adminToday() {
  let b = deskHeader('Danas', 'Utorak, 20.10.2026', [['Novi termin', { ic: 'plus' }]]);
  let y = 116;
  const sw = (DCW - 3 * 16) / 4;
  [['Termina danas', '8'], ['Na čekanju', '2'], ['Očekivani prihod', '18.400 din.'], ['Novih klijenata (7 dana)', '5']].forEach(([l, n], i) => {
    const x = DX + i * (sw + 16);
    b += card(x, y, sw, 96) + txt(x + 20, y + 32, l, { size: 13.5, fill: T.muted }) + txt(x + 20, y + 72, n, { size: 28, weight: 700, fill: i === 1 ? T.warning : T.text });
  });
  y += 120;
  const lw = DCW * 0.62;
  b += card(DX, y, lw, 520) + txt(DX + 20, y + 34, 'Raspored', { size: 17, weight: 600 });
  TODAY.forEach(([s, e, c, svc, st, status, kind], i) => {
    const ry = y + 56 + i * 76;
    b += line(DX + 20, ry, DX + lw - 20, ry);
    b += txt(DX + 20, ry + 32, s, { size: 16, weight: 700 }) + txt(DX + 20, ry + 52, e, { size: 13, fill: T.muted });
    b += rect(DX + 84, ry + 16, 3, 44, { rx: 1.5, fill: kind === 'warning' ? T.warning : T.primary });
    b += txt(DX + 100, ry + 32, c, { size: 15, weight: 600 }) + txt(DX + 100, ry + 52, `${svc} · ${st}`, { size: 13, fill: T.muted });
    b += badge(DX + lw - 200, ry + 27, status, kind).svg;
    b += kind === 'warning' ? button(DX + lw - 100, ry + 22, 'Potvrdi', { size: 's', w: 80 }).svg : iconBtn(DX + lw - 52, ry + 22, 'more', 'ghost').svg;
  });
  const rx = DX + lw + 24, rw = DCW - lw - 24;
  b += card(rx, y, rw, 250) + txt(rx + 20, y + 34, 'Zaposleni danas', { size: 17, weight: 600 });
  [['Ana Jovanović', '09:00 – 17:00', '4 termina', 'AJ'], ['Milica Petrović', '10:00 – 18:00', '2 termina', 'MP'], ['Jelena Ilić', '12:00 – 20:00', '2 termina', 'JI']].forEach(([n, h, c, ini], i) => {
    const ry = y + 60 + i * 60;
    b += avatar(rx + 40, ry + 22, 18, ini) + txt(rx + 68, ry + 18, n, { size: 14.5, weight: 600 }) + txt(rx + 68, ry + 37, h, { size: 12.5, fill: T.muted }) + txt(rx + rw - 20, ry + 27, c, { size: 13, fill: T.muted, anchor: 'end' });
  });
  b += card(rx, y + 270, rw, 250) + txt(rx + 20, y + 304, 'Zahtevi za potvrdu', { size: 17, weight: 600 });
  [['Ivana M.', 'Danas 12:00 · Manikir'], ['Marija M.', 'Danas 15:15 · Žensko šišanje']].forEach(([n, s], i) => {
    const ry = y + 324 + i * 96;
    b += txt(rx + 20, ry + 18, n, { size: 14.5, weight: 600 }) + txt(rx + 20, ry + 38, s, { size: 12.5, fill: T.muted });
    b += button(rx + 20, ry + 46, 'Potvrdi', { size: 's', w: 90 }).svg + button(rx + 118, ry + 46, 'Odbij', { size: 's', theme: 'secondary', w: 80 }).svg;
  });
  return desktop('Admin — Danas', 'Danas', b);
}

function adminCalendar() {
  let b = deskHeader('Kalendar', null, [['Blokiraj vreme', { theme: 'secondary', ic: 'lock' }], ['Novi termin', { ic: 'plus' }]]);
  let y = 112;
  b += iconBtn(DX, y, 'chevronLeft').svg + iconBtn(DX + 40, y, 'chevronRight').svg + button(DX + 80, y, 'Danas', { theme: 'secondary', size: 's' }).svg;
  b += txt(DX + 160, y + 22, 'Utorak, 20. oktobar 2026', { size: 17, weight: 600 });
  b += segmented(DX + DCW - 180, y - 3, ['Dan', 'Nedelja'], 0, { w: 180 }).svg;
  y += 50;
  const staff = [['Ana Jovanović', 'AJ'], ['Milica Petrović', 'MP'], ['Jelena Ilić', 'JI']];
  const tcol = 64, colW = (DCW - tcol) / staff.length, gh = DH - y - 24, hourH = 56, hours = 12;
  b += rect(DX, y, DCW, gh, { rx: 10, fill: T.surface, stroke: T.border });
  staff.forEach(([n, ini], i) => {
    const x = DX + tcol + i * colW;
    b += line(x, y, x, y + gh) + avatar(x + 28, y + 26, 14, ini) + txt(x + 50, y + 31, n, { size: 14, weight: 600 });
  });
  b += line(DX, y + 52, DX + DCW, y + 52);
  for (let h = 0; h < hours; h++) {
    const hy = y + 52 + h * hourH;
    if (h) b += line(DX + tcol, hy, DX + DCW, hy);
    b += txt(DX + 14, hy + 16, `${String(9 + h).padStart(2, '0')}:00`, { size: 12, fill: T.muted });
  }
  const at = (t) => { const [hh, mm] = t.split(':').map(Number); return y + 52 + ((hh - 9) + mm / 60) * hourH; };
  const events = [
    [0, '09:00', '09:45', 'Jovana R.', 'Žensko šišanje', 'primary'],
    [0, '15:15', '16:00', 'Marija M.', 'Žensko šišanje', 'warning'],
    [0, '17:30', '18:00', 'Petar S.', 'Muško šišanje', 'primary'],
    [1, '10:30', '12:00', 'Sanja K.', 'Farbanje', 'primary'],
    [1, '13:00', '14:00', 'Pauza', '', 'blocked'],
    [2, '12:00', '13:00', 'Ivana M.', 'Manikir', 'warning'],
    [2, '14:00', '15:00', 'Tamara L.', 'Manikir', 'primary'],
  ];
  events.forEach(([col, s, e, who, svc, kind]) => {
    const x = DX + tcol + col * colW + 6, ey = at(s) + 2, eh = at(e) - at(s) - 4;
    const fill = kind === 'warning' ? T.warningTint : kind === 'blocked' ? T.bg : T.primaryTint;
    const edge = kind === 'warning' ? T.warning : kind === 'blocked' ? T.borderDark : T.primary;
    b += rect(x, ey, colW - 12, eh, { rx: 6, fill, stroke: kind === 'blocked' ? T.border : 'none' }) + rect(x, ey, 4, eh, { rx: 2, fill: edge });
    b += txt(x + 14, ey + 19, `${s} ${who}`, { size: 13, weight: 600, fill: kind === 'blocked' ? T.muted : T.text });
    if (svc && eh > 44) b += txt(x + 14, ey + 36, svc, { size: 12, fill: T.muted });
  });
  const ny = at('11:52');
  b += `<circle cx="${DX + tcol}" cy="${ny}" r="4" fill="${T.danger}"/>` + line(DX + tcol, ny, DX + DCW, ny, T.danger);
  return desktop('Admin — Kalendar', 'Kalendar', b);
}

function adminAppointments() {
  let b = deskHeader('Termini', null, [['Novi termin', { ic: 'plus' }]]);
  let y = 112;
  b += input(DX, y, 280, '', '', { placeholder: 'Pretraga klijenta...', suffix: 'search' });
  b += select(DX + 296, y, 200, '', 'Ova nedelja') + select(DX + 512, y, 200, '', 'Svi zaposleni') + select(DX + 728, y, 200, '', 'Svi statusi');
  y += 64;
  const rows = [
    ['20.10. 09:00', personCell('Jovana Ristić', '064 222 3333', 'JR'), 'Žensko šišanje', 'Ana', '2.500 din.', badgeCell('Završen', 'neutral'), moreCell],
    ['20.10. 12:00', personCell('Ivana Mitić', '065 444 5555', 'IM'), 'Manikir', 'Jelena', '2.000 din.', badgeCell('Na čekanju', 'warning'), moreCell],
    ['20.10. 15:15', personCell('Marija Marković', '064 111 2222', 'MM'), 'Žensko šišanje', 'Ana', '2.500 din.', badgeCell('Na čekanju', 'warning'), moreCell],
    ['21.10. 10:00', personCell('Sanja Kovač', '063 777 8888', 'SK'), 'Farbanje', 'Milica', '4.500 din.', badgeCell('Potvrđen', 'success'), moreCell],
    ['21.10. 11:00', personCell('Nikola Đurić', '060 999 0000', 'NĐ'), 'Muško šišanje', 'Ana', '1.500 din.', badgeCell('Otkazan', 'danger'), moreCell],
    ['22.10. 09:30', personCell('Tamara Lazić', '061 123 9876', 'TL'), 'Manikir', 'Jelena', '2.000 din.', badgeCell('Nije došao', 'danger'), moreCell],
    ['22.10. 16:00', personCell('Petar Simić', '062 555 1212', 'PS'), 'Muško šišanje', 'Ana', '1.500 din.', badgeCell('Potvrđen', 'success'), moreCell],
  ];
  b += dataTable(DX, y, DCW, [['Termin', 14], ['Klijent', 26], ['Usluga', 18], ['Zaposleni', 12], ['Cena', 12], ['Status', 14], ['', 6]], rows, 64);
  const my = y + 44 + 64 * 2 + 40;
  const mx = DX + DCW - 220;
  b += rect(mx, my, 200, 176, { rx: 10, fill: T.surface, stroke: T.border });
  [['check', 'Potvrdi', T.text], ['check', 'Završen', T.text], ['user', 'Nije došao', T.text], ['edit', 'Izmeni', T.text], ['close', 'Otkaži', T.danger]].forEach(([ic, l, c], i) => {
    b += icon(ic, mx + 16, my + 14 + i * 32, c) + txt(mx + 40, my + 25 + i * 32, l, { size: 14, fill: c });
  });
  return desktop('Admin — Termini', 'Termini', b);
}

function adminServices(withModal = false) {
  let b = deskHeader('Usluge', 'Usluge koje klijenti vide i mogu da zakažu', [['Nova usluga', { ic: 'plus' }]]);
  const rows = SERVICES.map(([n, d, p], i) => [n, d, p, i === 4 ? 'Jelena' : 'Ana, Milica', badgeCell(i === 2 ? 'Neaktivna' : 'Aktivna', i === 2 ? 'neutral' : 'success'), moreCell]);
  b += dataTable(DX, 116, DCW, [['Naziv', 28], ['Trajanje', 12], ['Cena', 14], ['Rade je', 24], ['Status', 14], ['', 6]], rows, 60);
  let overlay = '';
  if (withModal) {
    const w = 520, h = 560, x = (DW - w) / 2, y = 150;
    overlay += rect(0, 0, DW, DH, { fill: '#000', op: 0.45 }) + rect(x, y, w, h, { rx: 12, fill: T.surface, stroke: T.border });
    overlay += txt(x + 24, y + 38, 'Nova usluga', { size: 18, weight: 600 }) + icon('close', x + w - 36, y + 26, T.muted) + line(x, y + 60, x + w, y + 60);
    overlay += input(x + 24, y + 80, w - 48, 'Naziv', 'Pramenovi');
    const hw = (w - 48 - 16) / 2;
    overlay += select(x + 24, y + 160, hw, 'Trajanje', '120 min') + input(x + 24 + hw + 16, y + 160, hw, 'Cena (din.)', '5.500');
    overlay += txt(x + 24, y + 253, 'Opis', { size: 13, weight: 600, fill: T.muted }) + rect(x + 24, y + 262, w - 48, 88, { rx: 8, fill: T.surface, stroke: T.borderDark }) + txt(x + 36, y + 290, 'Balayage ili klasični pramenovi.', { size: 15 });
    overlay += txt(x + 24, y + 384, 'Rade je', { size: 13, weight: 600, fill: T.muted });
    overlay += checkbox(x + 24, y + 398, 'Ana Jovanović', true) + checkbox(x + 200, y + 398, 'Milica Petrović', true) + checkbox(x + 24, y + 430, 'Jelena Ilić', false);
    overlay += line(x, y + h - 72, x + w, y + h - 72);
    overlay += button(x + w - 24 - 110, y + h - 54, 'Sačuvaj', { ic: 'check', w: 110 }).svg + button(x + w - 24 - 110 - 12 - 100, y + h - 54, 'Otkaži', { theme: 'secondary', w: 100 }).svg;
  }
  return desktop(withModal ? 'Admin — Usluge (modal)' : 'Admin — Usluge', 'Usluge', b, { overlay });
}

function adminStaff() {
  let b = deskHeader('Zaposleni', null, [['Novi zaposleni', { ic: 'plus' }]]);
  const people = [['Ana Jovanović', 'Frizer', 'AJ', 'Žensko i muško šišanje, feniranje, farbanje', 'Pon – Pet 09–17'], ['Milica Petrović', 'Frizer, kolorista', 'MP', 'Žensko šišanje, farbanje', 'Uto – Sub 10–18'], ['Jelena Ilić', 'Manikir', 'JI', 'Manikir', 'Pon – Pet 12–20']];
  const cw = (DCW - 32) / 3;
  people.forEach(([n, r, ini, s, h], i) => {
    const x = DX + i * (cw + 16), y = 116;
    b += card(x, y, cw, 300) + avatar(x + 48, y + 52, 28, ini) + txt(x + 88, y + 48, n, { size: 16, weight: 600 }) + txt(x + 88, y + 68, r, { size: 13, fill: T.muted });
    b += iconBtn(x + cw - 48, y + 24, 'more', 'ghost').svg + line(x + 20, y + 100, x + cw - 20, y + 100);
    b += txt(x + 20, y + 128, 'Usluge', { size: 12.5, weight: 600, fill: T.muted }) + txt(x + 20, y + 150, s.length > 34 ? s.slice(0, 34) + '…' : s, { size: 14 });
    b += txt(x + 20, y + 186, 'Radno vreme', { size: 12.5, weight: 600, fill: T.muted }) + txt(x + 20, y + 208, h, { size: 14 });
    const days = ['P', 'U', 'S', 'Č', 'P', 'S', 'N'];
    days.forEach((d, di) => {
      const on = i === 1 ? di >= 1 && di <= 5 : di <= 4;
      b += rect(x + 20 + di * 36, y + 234, 30, 30, { rx: 15, fill: on ? T.primaryTint : T.bg }) + txt(x + 35 + di * 36, y + 254, d, { size: 12.5, weight: 600, fill: on ? T.primary : T.muted, anchor: 'middle' });
    });
  });
  return desktop('Admin — Zaposleni', 'Zaposleni', b);
}

function adminClients() {
  let b = deskHeader('Klijenti', '124 klijenta', [['Novi klijent', { ic: 'plus', theme: 'secondary' }]]);
  b += input(DX, 112, 320, '', '', { placeholder: 'Ime, telefon ili email...', suffix: 'search' });
  const rows = [
    [personCell('Marija Marković', 'marija@example.com', 'MM'), '064 111 2222', '12', '20.10.2026', badgeCell('Nalog', 'primary'), moreCell],
    [personCell('Sanja Kovač', 'sanja@example.com', 'SK'), '063 777 8888', '8', '21.10.2026', badgeCell('Nalog', 'primary'), moreCell],
    [personCell('Ivana Mitić', null, 'IM'), '065 444 5555', '3', '20.10.2026', badgeCell('Gost', 'neutral'), moreCell],
    [personCell('Petar Simić', 'petar@example.com', 'PS'), '062 555 1212', '5', '22.10.2026', badgeCell('Nalog', 'primary'), moreCell],
    [personCell('Tamara Lazić', null, 'TL'), '061 123 9876', '1', '22.10.2026', badgeCell('Gost', 'neutral'), moreCell],
  ];
  b += dataTable(DX, 176, DCW, [['Klijent', 32], ['Telefon', 18], ['Termina', 12], ['Poslednji termin', 18], ['Tip', 12], ['', 6]], rows, 64);
  return desktop('Admin — Klijenti', 'Klijenti', b);
}

function adminSettings() {
  let b = deskHeader('Podešavanja', null, [['Sačuvaj', { ic: 'check' }]]);
  let y = 112;
  b += segmented(DX, y, ['Biznis', 'Radno vreme', 'Pravila zakazivanja', 'Neradni dani'], 0).svg;
  y += 60;
  const lw = DCW * 0.6;
  b += card(DX, y, lw, 560) + txt(DX + 24, y + 36, 'Podaci o biznisu', { size: 17, weight: 600 });
  const hw = (lw - 48 - 16) / 2;
  b += input(DX + 24, y + 56, hw, 'Naziv', BUSINESS) + select(DX + 24 + hw + 16, y + 56, hw, 'Delatnost', 'Kozmetički salon');
  b += input(DX + 24, y + 136, hw, 'Adresa', 'Glavna 1') + input(DX + 24 + hw + 16, y + 136, hw, 'Grad', 'Beograd');
  b += input(DX + 24, y + 216, hw, 'Telefon', '060 123 4567') + input(DX + 24 + hw + 16, y + 216, hw, 'WhatsApp', '060 123 4567');
  b += input(DX + 24, y + 296, hw, 'Email', 'zakazivanje@fiskultura.rs') + input(DX + 24 + hw + 16, y + 296, hw, 'Instagram', '@salonlepota');
  b += input(DX + 24, y + 376, hw, 'PIB', '112233445') + input(DX + 24 + hw + 16, y + 376, hw, 'Matični broj', '21987654');
  b += txt(DX + 24, y + 469, 'Opis', { size: 13, weight: 600, fill: T.muted }) + rect(DX + 24, y + 478, lw - 48, 60, { rx: 8, fill: T.surface, stroke: T.borderDark }) + txt(DX + 36, y + 504, 'Salon u centru grada, radimo od 2015.', { size: 15 });
  const rx = DX + lw + 24, rw = DCW - lw - 24;
  b += card(rx, y, rw, 240) + txt(rx + 24, y + 36, 'Logo', { size: 17, weight: 600 });
  b += logo(rx + 24, y + 60, 96) + button(rx + 140, y + 70, 'Promeni', { theme: 'secondary', size: 's', ic: 'image' }).svg + txt(rx + 140, y + 136, 'PNG ili JPG, najviše 1 MB', { size: 12.5, fill: T.muted });
  b += card(rx, y + 260, rw, 300) + txt(rx + 24, y + 296, 'Pravila (pregled)', { size: 17, weight: 600 });
  [['Interval termina', '15 min'], ['Zakazivanje unapred', 'do 60 dana'], ['Otkazivanje', 'najkasnije 24 h pre'], ['Potvrda termina', 'ručno (admin)'], ['Gost bez naloga', 'dozvoljeno']].forEach(([l, v], i) => {
    b += txt(rx + 24, y + 336 + i * 40, l, { size: 14, fill: T.muted }) + txt(rx + rw - 24, y + 336 + i * 40, v, { size: 14, weight: 600, anchor: 'end' });
  });
  return desktop('Admin — Podešavanja', 'Podešavanja', b);
}

function components() {
  const W = 1440, H = 900;
  let b = rect(0, 0, W, H, { fill: T.bg }) + txt(40, 56, 'Komponente i tokeni — Zakazivanje', { size: 26, weight: 700 });
  let y = 96;
  b += txt(40, y, 'Boje', { size: 16, weight: 600 });
  const sw = [['primary', T.primary], ['primary-dark', T.primaryDark], ['primary-tint', T.primaryTint], ['text', T.text], ['text-muted', T.muted], ['border', T.border], ['bg', T.bg], ['success', T.success], ['warning', T.warning], ['danger', T.danger], ['info', T.info]];
  sw.forEach(([n, c], i) => {
    const x = 40 + i * 120;
    b += rect(x, y + 16, 104, 64, { rx: 8, fill: c, stroke: T.border }) + txt(x, y + 100, n, { size: 12.5, weight: 600 }) + txt(x, y + 116, c, { size: 12, fill: T.muted });
  });
  y += 160;
  b += txt(40, y, 'Tipografija', { size: 16, weight: 600 });
  b += txt(40, y + 40, 'Naslov stranice 26/700', { size: 26, weight: 700 }) + txt(420, y + 40, 'Naslov kartice 17/600', { size: 17, weight: 600 }) + txt(720, y + 40, 'Tekst 14/400', { size: 14 }) + txt(900, y + 40, 'Pomoćni tekst 13 muted', { size: 13, fill: T.muted });
  y += 90;
  b += txt(40, y, 'Dugmad', { size: 16, weight: 600 });
  let bx = 40;
  [['Zakaži termin', { size: 'l' }], ['Sačuvaj', { ic: 'check' }], ['Otkaži', { theme: 'secondary' }], ['Obriši', { theme: 'danger', ic: 'trash' }], ['Odjavi se', { theme: 'ghost' }], ['Potvrdi', { size: 's' }], ['Sačuvaj', { disabled: true }]].forEach(([l, o]) => {
    const btn = button(bx, y + 16, l, o);
    b += btn.svg;
    bx += btn.w + 16;
  });
  y += 116;
  b += txt(40, y, 'Polja', { size: 16, weight: 600 });
  b += input(40, y + 12, 300, 'Email', 'marija@example.com') + input(360, y + 12, 300, 'Telefon', '', { placeholder: '064 ...' }) + select(680, y + 12, 300, 'Kanal obaveštenja', 'WhatsApp') + input(1000, y + 12, 300, 'Lozinka', '••••', { error: 'Lozinka mora imati najmanje 8 karaktera.' });
  y += 120;
  b += txt(40, y, 'Statusi termina', { size: 16, weight: 600 });
  bx = 40;
  [['Na čekanju', 'warning'], ['Potvrđen', 'success'], ['Završen', 'neutral'], ['Otkazan', 'danger'], ['Nije došao', 'danger'], ['Nalog', 'primary'], ['Gost', 'neutral']].forEach(([l, k]) => { const bd = badge(bx, y + 16, l, k); b += bd.svg; bx += bd.w + 12; });
  y += 76;
  b += txt(40, y, 'Izbor termina i segmenti', { size: 16, weight: 600 });
  ['09:00', '09:45', '15:15', '13:45'].forEach((s, i) => {
    const sel = s === '15:15', taken = s === '13:45';
    b += rect(40 + i * 90, y + 16, 80, 40, { rx: 8, fill: sel ? T.primary : T.surface, stroke: sel ? T.primary : T.borderDark }) + txt(80 + i * 90, y + 41, s, { size: 15, weight: 600, fill: sel ? T.onPrimary : taken ? T.borderDark : T.text, anchor: 'middle' });
  });
  b += segmented(420, y + 17, ['Predstojeći', 'Prošli'], 0, { w: 260 }).svg + segmented(700, y + 17, ['Dan', 'Nedelja'], 1, { w: 180 }).svg;
  y += 90;
  b += txt(40, y, 'Poruke', { size: 16, weight: 600 });
  b += rect(40, y + 16, 380, 52, { rx: 8, fill: T.dangerTint }) + txt(56, y + 47, 'Pogrešan email ili lozinka.', { size: 14, fill: T.danger });
  b += rect(440, y + 16, 380, 52, { rx: 8, fill: T.surface, stroke: T.border }) + rect(440, y + 16, 4, 52, { fill: T.success }) + icon('check', 458, y + 36, T.success) + txt(480, y + 47, 'Termin je potvrđen.', { size: 14 });
  b += rect(840, y + 16, 380, 52, { rx: 10, fill: T.infoTint }) + txt(856, y + 47, 'Otkazivanje najkasnije 24 h pre termina.', { size: 13.5, fill: T.info });
  return { W, H, svg: group('Komponente', b) };
}

function save(path, frame) {
  const file = join(OUT, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(
    file,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${frame.W}" height="${frame.H}" viewBox="0 0 ${frame.W} ${frame.H}" font-family="Inter, 'Segoe UI', Roboto, Arial, sans-serif">${frame.svg}</svg>\n`,
  );
  return path;
}

const files = [
  save('mobilni/01-pocetna.svg', home()),
  save('mobilni/02-zakazivanje-usluga.svg', bookService()),
  save('mobilni/03-zakazivanje-zaposleni.svg', bookStaff()),
  save('mobilni/04-zakazivanje-termin.svg', bookTime()),
  save('mobilni/05-zakazivanje-potvrda.svg', bookConfirm()),
  save('mobilni/06-zakazano.svg', booked()),
  save('mobilni/07-moji-termini.svg', myAppointments()),
  save('mobilni/08-profil.svg', profile()),
  save('mobilni/09-admin-danas.svg', adminTodayMobile()),
  save('mobilni/10-admin-meni.svg', adminMenuMobile()),
  save('auth/prijava.svg', authScreen('Prijava', 'Dobro došla nazad', 'Prijavi se da vidiš svoje termine', [
    { label: 'Email', value: 'marija@example.com' },
    { label: 'Lozinka', value: '••••••••', suffix: 'lock' },
  ], 'Prijavi se', ['Zaboravljena lozinka?', 'Nemaš nalog? Registruj se'])),
  save('auth/registracija.svg', authScreen('Registracija', 'Napravi nalog', 'Za brže zakazivanje i pregled termina', [
    { row: [['Ime', 'Marija'], ['Prezime', 'Marković']] },
    { label: 'Email', value: 'marija@example.com' },
    { label: 'Telefon', value: '064 111 2222' },
    { select: true, label: 'Obaveštenja preko', value: 'WhatsApp' },
    { label: 'Lozinka', value: '••••••••', suffix: 'lock' },
  ], 'Registruj se', ['Već imaš nalog? Prijavi se'])),
  save('auth/zaboravljena-lozinka.svg', authScreen('Zaboravljena lozinka', 'Zaboravljena lozinka', 'Poslaćemo ti link za novu lozinku', [
    { label: 'Email', value: 'marija@example.com', suffix: 'mail' },
  ], 'Pošalji link', ['Nazad na prijavu'])),
  save('auth/nova-lozinka.svg', authScreen('Nova lozinka', 'Nova lozinka', null, [
    { label: 'Nova lozinka', value: '••••••••', suffix: 'lock' },
    { label: 'Ponovi lozinku', value: '••••••••', suffix: 'lock' },
  ], 'Sačuvaj lozinku', ['Nazad na prijavu'])),
  save('admin/01-danas.svg', adminToday()),
  save('admin/02-kalendar.svg', adminCalendar()),
  save('admin/03-termini.svg', adminAppointments()),
  save('admin/04-usluge.svg', adminServices()),
  save('admin/05-usluge-modal.svg', adminServices(true)),
  save('admin/06-zaposleni.svg', adminStaff()),
  save('admin/07-klijenti.svg', adminClients()),
  save('admin/08-podesavanja.svg', adminSettings()),
  save('components/komponente.svg', components()),
];

console.log(`${files.length} frejmova:\n  ${files.join('\n  ')}`);
