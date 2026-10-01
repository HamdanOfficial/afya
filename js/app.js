import { state, loadRef, loadAll, subscribe, getSetting, setSetting } from './store.js';
import { seedIfNeeded } from './actions.js';
import { icon } from './icons.js';
import { closeAllSheets } from './ui.js';
import { dayKey, fmtDate } from './dates.js';
import today from './screens/today.js';
import foods from './screens/foods.js';
import foodDetail from './screens/foodDetail.js';
import search from './screens/search.js';
import trials from './screens/trials.js';
import suggest from './screens/suggest.js';
import settings from './screens/settings.js';
import doctor from './screens/doctor.js';
import schedule from './screens/schedule.js';
import report from './screens/report.js';
import help from './screens/help.js';
import { mountOnboarding } from './screens/onboarding.js';
import { shouldShowGate, mountGate } from './screens/installGate.js';
import { openAskClaude } from './screens/askClaude.js';
import { logoSVG, applyPalette } from './brand.js';
import { maybeStartTour, startTour } from './tour.js';

const ROUTES = { today, foods, search, trials, suggest, settings, doctor, schedule, report, help, food: foodDetail };
const TABS = [
  { route: 'today', label: 'اليوم', icon: 'today' },
  { route: 'foods', label: 'أكلاتي', icon: 'foods' },
  { route: 'search', label: 'أقدر آكل؟', icon: 'search' },
  { route: 'trials', label: 'تجاربي', icon: 'trials' },
  { route: 'suggest', label: 'اقترح لي', icon: 'suggest' },
];

const $ = (s) => document.querySelector(s);
const view = $('#view');
const header = $('#header');
const tabbar = $('#tabbar');
const fab = $('#fab');

let current = null; // { route, params, screen, handle }
let waitingWorker = null;
let updateRequested = false;

// ---------- theme ----------
const darkMQ = window.matchMedia('(prefers-color-scheme: dark)');

function chosenTheme() {
  try { return localStorage.getItem('theme'); } catch { return null; }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  applyPalette();
  const btn = $('#theme-btn');
  if (btn) {
    btn.innerHTML = icon(theme === 'dark' ? 'sun' : 'moon');
    btn.setAttribute('aria-label', theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي');
  }
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('theme', next); } catch { /* ignore */ }
  setSetting('theme', next);
  applyTheme(next);
}

darkMQ.addEventListener?.('change', (e) => { if (!chosenTheme()) applyTheme(e.matches ? 'dark' : 'light'); });

// ---------- shell ----------
function renderHeader(title, back) {
  const isToday = current?.route === 'today';
  header.innerHTML = `
    ${back ? `<button class="icon-btn back-btn" id="back-btn" aria-label="رجوع">${icon('back')}</button>` : ''}
    <h1 class="app-title" id="screen-title">${isToday ? `<span class="brand-logo" aria-hidden="true">${logoSVG()}</span>عافية <small>${fmtDate(dayKey(), { year: false, weekday: true })}</small>` : title}</h1>
    <button class="icon-btn ${current?.route === 'doctor' ? 'on' : ''}" id="doctor-btn" aria-label="متى أراجع الطبيب؟" data-tour="header-doctor">${icon('doctor')}</button>
    <button class="icon-btn" id="theme-btn" data-tour="header-theme"></button>
    <button class="icon-btn ${current?.route === 'settings' ? 'on' : ''}" id="gear-btn" aria-label="الإعدادات">${icon('gear')}</button>`;
  applyTheme(document.documentElement.dataset.theme);
  $('#theme-btn').addEventListener('click', toggleTheme);
  $('#gear-btn').addEventListener('click', () => app.go('settings'));
  $('#doctor-btn').addEventListener('click', () => app.go('doctor'));
  $('#back-btn')?.addEventListener('click', () => {
    if (history.state?.inApp) history.back();
    else app.go(back, { replace: true });
  });
}

function renderTabs() {
  tabbar.innerHTML = TABS.map((t) => `
    <button class="tab" data-route="${t.route}" ${current?.route === t.route ? 'aria-current="page"' : ''}>
      ${icon(t.icon)}<span>${t.label}</span>
    </button>`).join('');
}

tabbar.addEventListener('click', (e) => {
  const tab = e.target.closest('[data-route]');
  if (!tab) return;
  if (current?.route === tab.dataset.route) { window.scrollTo({ top: 0 }); if (tab.dataset.route === 'search') $('#q')?.focus(); return; }
  app.go(tab.dataset.route);
});

function parseHash() {
  const [route, ...params] = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return { route: ROUTES[route] ? route : 'today', params: params.map(decodeURIComponent) };
}

function show(route, params = []) {
  closeAllSheets();
  current?.handle?.destroy?.();
  const screen = ROUTES[route];
  current = { route, params, screen, handle: null };
  view.innerHTML = '';
  window.scrollTo(0, 0);
  renderHeader(screen.title, screen.back);
  renderTabs();
  current.handle = screen.mount(view, params, app) || {};
}

let pending = false;
function refresh() {
  if (pending) return;
  pending = true;
  queueMicrotask(() => { pending = false; current?.handle?.update?.(); });
}

export const app = {
  get updateReady() { return !!waitingWorker; },
  go(route, { replace = false } = {}) {
    const [name, ...params] = route.split('/');
    const hash = `#/${route}`;
    if (replace) history.replaceState({ inApp: true }, '', hash);
    else if (location.hash !== hash) history.pushState({ inApp: true }, '', hash);
    show(name, params);
  },
  setTitle(t) { const el = $('#screen-title'); if (el) el.textContent = t; },
  currentRoute() { return current?.route; },
  refreshHeader() { if (current) renderHeader(current.screen.title, current.screen.back); },
  touring: false,
  startTour(name = 'main') { return startTour(app, name); },
  applyUpdate() {
    if (!waitingWorker) { location.reload(); return; }
    updateRequested = true;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  },
  restart() { location.reload(); },
};

window.addEventListener('popstate', () => { const { route, params } = parseHash(); show(route, params); });

// ---------- service worker & updates ----------
async function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('./sw.js');
    const onWaiting = (w) => { waitingWorker = w; refresh(); };
    if (reg.waiting && navigator.serviceWorker.controller) onWaiting(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw?.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) onWaiting(nw);
      });
    });
    // Reload only when she tapped "حدّثي" — not when the very first install takes control.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!updateRequested) return;
      updateRequested = false;
      location.reload();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
  } catch { /* offline first load or unsupported */ }
}

// ---------- boot ----------
let lastDay = dayKey();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !current) return;
  if (dayKey() !== lastDay) { lastDay = dayKey(); show(current.route, current.params); } else refresh();
});

function startApp() {
  document.body.classList.remove('no-tabs');
  tabbar.hidden = false;
  fab.hidden = false;
  fab.innerHTML = `${icon('sparkle')}<span>اسألي Claude</span>`;
  fab.onclick = openAskClaude;
  subscribe(refresh);
  const { route, params } = parseHash();
  history.replaceState({ inApp: true }, '', `#/${[route, ...params].join('/')}`);
  show(route, params);
  maybeStartTour(app);
}

function bare() {
  document.body.classList.add('no-tabs');
  tabbar.hidden = true;
  fab.hidden = true;
}

async function boot() {
  applyTheme(document.documentElement.dataset.theme);
  registerSW();
  if (shouldShowGate()) {
    bare();
    header.hidden = true;
    mountGate(view, () => { header.hidden = false; boot2(); });
    return;
  }
  boot2();
}

async function boot2() {
  try {
    await loadRef();
    await loadAll();
    await seedIfNeeded();
  } catch (e) {
    view.innerHTML = `<div class="card empty"><p>صار خطأ وما قدرت أفتح البيانات. سكّري التطبيق وافتحيه مرة ثانية.</p><p class="muted small" dir="ltr">${String(e?.message || e)}</p></div>`;
    return;
  }
  if (!getSetting('onboardingDone')) {
    bare();
    header.innerHTML = `<h1 class="app-title"><span class="brand-logo" aria-hidden="true">${logoSVG()}</span>عافية</h1><button class="icon-btn" id="theme-btn"></button>`;
    applyTheme(document.documentElement.dataset.theme);
    $('#theme-btn').addEventListener('click', toggleTheme);
    mountOnboarding(view, () => startApp());
    return;
  }
  startApp();
}

boot();

// Exposed for tests/debugging only.
window.__afya = { state, app };
