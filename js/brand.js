// Color palettes (each has a light and a dark version in app.css) and the in-app logo.
// The day/night switch stays in the header; the palette is chosen in settings.

// Swatches are drawn from the palette's own CSS variables (no hard-coded colors here).
export const PALETTES = [
  { id: 'classic', label: 'كلاسيكي' },
  { id: 'national', label: 'اليوم الوطني' },
  { id: 'girly', label: 'بناتي' },
  { id: 'lavender', label: 'لافندر' },
  { id: 'ocean', label: 'بحري' },
];

export const LOGOS = [
  { id: 'daisy', label: 'بابونج' },
  { id: 'drop', label: 'قطرة' },
  { id: 'leaf', label: 'ورقة' },
  { id: 'heart', label: 'قلب أوراق' },
];

const read = (k, fallback) => { try { return localStorage.getItem(k) || fallback; } catch { return fallback; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };

export const currentPalette = () => {
  const p = read('palette', 'classic');
  return PALETTES.some((x) => x.id === p) ? p : 'classic';
};
export const currentLogo = () => {
  const l = read('logo', 'daisy');
  return LOGOS.some((x) => x.id === l) ? l : 'daisy';
};

export function syncThemeColor() {
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', bg));
}

export function applyPalette(id = currentPalette(), { save = false } = {}) {
  document.documentElement.dataset.palette = id;
  if (save) write('palette', id);
  syncThemeColor();
}

export function setLogo(id) { write('logo', id); }

// Symbol drawn in --on-accent over an --accent rounded square, so it follows the palette.
const SYMBOLS = {
  drop: '<path fill="var(--on-accent)" d="M50 20.6C47.5 33.2 29 39.6 29 58.4a21 21 0 0 0 42 0C71 39.6 52.5 33.2 50 20.6Z"/>',
  leaf: '<path fill="var(--on-accent)" d="M26 74C24 44 46 24 78 22c2 32-18 54-52 52Z"/><path d="M30 70 66 34" stroke="var(--accent)" stroke-width="3.5" stroke-linecap="round" fill="none"/>',
  daisy: `${Array.from({ length: 8 }, (_, i) => `<ellipse cx="50" cy="29" rx="8" ry="15" fill="var(--on-accent)" transform="rotate(${i * 45} 50 50)"/>`).join('')}<circle cx="50" cy="50" r="10" fill="var(--accent)" stroke="var(--on-accent)" stroke-width="4"/>`,
  heart: '<path fill="var(--on-accent)" d="M50 80C22 61 18 37 33 29c9-5 16 1 17 9 1-8 8-14 17-9 15 8 11 32-17 51Z"/><path d="M50 40v34" stroke="var(--accent)" stroke-width="3.5" stroke-linecap="round" fill="none"/>',
};

export function logoSVG(id = currentLogo(), size = 28) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><rect width="100" height="100" rx="24" fill="var(--accent)"/>${SYMBOLS[id] || SYMBOLS.drop}</svg>`;
}
