(function () {
  var root = document.documentElement;

  function parseHex(hex) {
    var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex || '').trim());
    if (!m) return null;
    var h = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1];
    return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); });
  }

  function toHex(rgb) {
    return '#' + rgb.map(function (c) { return ('0' + Math.round(Math.max(0, Math.min(255, c))).toString(16)).slice(-2); }).join('');
  }

  function mix(a, b, weight) {
    return a.map(function (c, i) { return c * (1 - weight) + b[i] * weight; });
  }

  function luminance(rgb) {
    var l = rgb.map(function (c) {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
  }

  function applyTheme(business) {
    var primary = parseHex(business.theme_primary);
    if (!primary) return;
    var secondary = parseHex(business.theme_secondary) || mix(primary, [255, 255, 255], 0.25);
    var tertiary = parseHex(business.theme_tertiary) || mix(primary, [255, 255, 255], 0.55);
    var white = [255, 255, 255];
    var black = [0, 0, 0];
    var light = luminance(primary) > 0.45;
    root.style.setProperty('--accent', toHex(primary));
    root.style.setProperty('--accent-2', toHex(secondary));
    root.style.setProperty('--accent-3', toHex(tertiary));
    root.style.setProperty('--accent-soft', toHex(mix(tertiary, white, 0.8)));
    root.style.setProperty('--accent-text', toHex(light ? mix(primary, black, 0.55) : primary));
    root.style.setProperty('--on-accent', light ? '#1c1917' : '#ffffff');
  }

  function applyBrand(business) {
    if (business.name) {
      document.querySelectorAll('[data-salon-name]').forEach(function (el) { el.textContent = business.name; });
    }
    if (business.logo) {
      document.querySelectorAll('img[data-salon-logo]').forEach(function (img) {
        img.src = business.logo;
        img.hidden = false;
      });
    }
  }

  function setAll(open) {
    document.querySelectorAll('details.step').forEach(function (d) { d.open = open; });
  }

  function openFromHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    var target = document.getElementById(id);
    var details = target && (target.tagName === 'DETAILS' ? target : target.closest('details'));
    if (details) {
      details.open = true;
      details.scrollIntoView({ block: 'start' });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-open-all]').forEach(function (b) { b.addEventListener('click', function () { setAll(true); }); });
    document.querySelectorAll('[data-close-all]').forEach(function (b) { b.addEventListener('click', function () { setAll(false); }); });
    openFromHash();
  });
  window.addEventListener('hashchange', openFromHash);

  var printState = [];
  window.addEventListener('beforeprint', function () {
    printState = Array.prototype.map.call(document.querySelectorAll('details.step'), function (d) { return [d, d.open]; });
    setAll(true);
  });
  window.addEventListener('afterprint', function () {
    printState.forEach(function (s) { s[0].open = s[1]; });
  });

  var CACHE_KEY = 'uputstvo-salon';
  var cached = null;
  try { cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (e) { cached = null; }
  if (cached) {
    applyTheme(cached);
    document.addEventListener('DOMContentLoaded', function () { applyBrand(cached); });
  }

  fetch('/api/public/business', { headers: { Accept: 'application/json' } })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function (body) {
      var business = body && body.data ? body.data : body;
      if (!business) return;
      var brand = { name: business.name, logo: business.logo, theme_primary: business.theme_primary, theme_secondary: business.theme_secondary, theme_tertiary: business.theme_tertiary };
      applyTheme(brand);
      applyBrand(brand);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(brand)); } catch (e) {}
    })
    .catch(function () {});
})();
