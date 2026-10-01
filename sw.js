// Service worker: precache everything so the app works fully offline.
// Bump VERSION (and js/version.js) on every release — a new cache name triggers the update bar.
const VERSION = '1.0.0';
const CACHE = `afya-v${VERSION}`;

const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'data/reference.json',
  'fonts/ibm-plex-sans-arabic-arabic-400-normal.woff2',
  'fonts/ibm-plex-sans-arabic-arabic-500-normal.woff2',
  'fonts/ibm-plex-sans-arabic-arabic-700-normal.woff2',
  'fonts/ibm-plex-sans-arabic-latin-400-normal.woff2',
  'fonts/ibm-plex-sans-arabic-latin-500-normal.woff2',
  'fonts/ibm-plex-sans-arabic-latin-700-normal.woff2',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
  'js/app.js',
  'js/actions.js',
  'js/alerts.js',
  'js/backup.js',
  'js/claudePrompt.js',
  'js/dates.js',
  'js/db.js',
  'js/flows.js',
  'js/icons.js',
  'js/normalize.js',
  'js/profile.js',
  'js/scoring.js',
  'js/store.js',
  'js/suggest.js',
  'js/ui.js',
  'js/version.js',
  'js/screens/askClaude.js',
  'js/screens/doctor.js',
  'js/screens/foodDetail.js',
  'js/screens/foods.js',
  'js/screens/installGate.js',
  'js/screens/onboarding.js',
  'js/screens/search.js',
  'js/screens/settings.js',
  'js/screens/suggest.js',
  'js/screens/today.js',
  'js/screens/trials.js',
];

self.addEventListener('install', (event) => {
  // cache: 'reload' skips the HTTP cache so a new version never stores stale files.
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))),
  );
  // No skipWaiting here: the page shows "فيه تحديث جديد" and she decides when.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('afya-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    // Only this version's cache, so a leftover older cache can never serve stale files.
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      return fetch(req).catch(() => (req.mode === 'navigate' ? cache.match('index.html') : Response.error()));
    }),
  );
});
