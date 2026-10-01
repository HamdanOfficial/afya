// Shared UI pieces: escaping, bottom sheets, undo snackbar, chips, badges.
import { icon } from './icons.js';
import { band, pctLabel, RATING, CONFIDENCE } from './scoring.js';

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Delegate clicks on [data-act] inside root to handlers[act](el, event).
export function delegate(root, handlers, type = 'click') {
  const fn = (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || !root.contains(el)) return;
    const h = handlers[el.dataset.act];
    if (h) h(el, e);
  };
  root.addEventListener(type, fn);
  return () => root.removeEventListener(type, fn);
}

// ---------- bottom sheet ----------
const sheetStack = [];

export function openSheet({ title = '', body = '', className = '', onMount, onClose, dismissible = true } = {}) {
  const wrapEl = document.createElement('div');
  wrapEl.className = 'sheet-wrap';
  wrapEl.innerHTML = `
    <div class="sheet-backdrop" data-close></div>
    <div class="sheet ${className}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="sheet-head">
        <h2 class="sheet-title">${esc(title)}</h2>
        ${dismissible ? `<button class="icon-btn" data-close aria-label="إغلاق">${icon('x')}</button>` : ''}
      </div>
      <div class="sheet-body">${body}</div>
    </div>`;
  document.body.appendChild(wrapEl);
  const prevFocus = document.activeElement;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    wrapEl.remove();
    sheetStack.splice(sheetStack.indexOf(close), 1);
    onClose?.();
    prevFocus?.focus?.({ preventScroll: true });
  };
  sheetStack.push(close);
  if (dismissible) {
    wrapEl.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  }
  const sheetEl = wrapEl.querySelector('.sheet');
  onMount?.(sheetEl, close);
  if (!sheetEl.contains(document.activeElement)) sheetEl.setAttribute('tabindex', '-1'), sheetEl.focus({ preventScroll: true });
  return close;
}

export function closeAllSheets() {
  while (sheetStack.length) sheetStack[sheetStack.length - 1]();
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sheetStack.length) sheetStack[sheetStack.length - 1]();
});

// Ask a question with two or more buttons. Resolves to the chosen value (or null if dismissed).
export function ask({ title, text = '', buttons }) {
  return new Promise((resolve) => {
    let answered = false;
    openSheet({
      title,
      body: `${text ? `<p class="sheet-text">${esc(text)}</p>` : ''}
        <div class="btn-col">${buttons.map((b, i) => `<button class="btn ${b.primary ? 'btn-primary' : b.danger ? 'btn-danger' : 'btn-secondary'}" data-i="${i}">${esc(b.label)}</button>`).join('')}</div>`,
      onMount(el, close) {
        el.querySelectorAll('[data-i]').forEach((btn) => btn.addEventListener('click', () => {
          answered = true;
          close();
          resolve(buttons[Number(btn.dataset.i)].value);
        }));
      },
      onClose() { if (!answered) resolve(null); },
    });
  });
}

// ---------- snackbar with undo ----------
let snackTimer = null;

export function snackbar(message, { actionLabel = 'تراجع', onAction, duration = 5000 } = {}) {
  let el = document.getElementById('snackbar');
  clearTimeout(snackTimer);
  el.innerHTML = `<span>${esc(message)}</span>${onAction ? `<button class="snack-btn" type="button">${esc(actionLabel)}</button>` : ''}`;
  el.hidden = false;
  const hide = () => { el.hidden = true; el.innerHTML = ''; };
  if (onAction) {
    el.querySelector('.snack-btn').addEventListener('click', () => { clearTimeout(snackTimer); hide(); onAction(); }, { once: true });
  }
  snackTimer = setTimeout(hide, duration);
}

export const toast = (message) => snackbar(message, { duration: 3000 });

// ---------- chips ----------
// options: [{id,label}], selected: id or [ids]
export function chips(name, options, selected, { multi = false, small = false } = {}) {
  const sel = multi ? new Set(selected || []) : new Set(selected != null && selected !== '' ? [selected] : []);
  return `<div class="chips ${small ? 'chips-sm' : ''}" role="group" data-chips="${esc(name)}" data-multi="${multi ? 1 : 0}">
    ${options.map((o) => `<button type="button" class="chip" data-id="${esc(o.id)}" aria-pressed="${sel.has(o.id)}">${esc(o.label)}</button>`).join('')}
  </div>`;
}

// Wire chip groups inside root. onChange(name, value) — value is id/null (single) or array (multi).
export function bindChips(root, onChange) {
  root.querySelectorAll('[data-chips]').forEach((group) => {
    group.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      const multi = group.dataset.multi === '1';
      const pressed = chip.getAttribute('aria-pressed') === 'true';
      if (!multi) group.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', 'false'));
      chip.setAttribute('aria-pressed', String(!pressed));
      onChange(group.dataset.chips, chipValue(group));
    });
  });
}

export function chipValue(group) {
  const ids = [...group.querySelectorAll('.chip[aria-pressed="true"]')].map((c) => c.dataset.id);
  return group.dataset.multi === '1' ? ids : ids[0] ?? null;
}

// ---------- badges ----------
export function pctBadge(info) {
  const b = band(info?.pct);
  if (b === 'none') return `<span class="pct pct-none">ما انجربت</span>`;
  return `<span class="pct pct-${b}">${esc(pctLabel(info))}${info.manual ? ' <span class="tag">يدوي</span>' : ''}</span>`;
}

export function ratingBadge(r) {
  const m = RATING[r.rating];
  return `<span class="rating rating-${m.band}">${m.emoji} ${m.word}</span>`;
}

export const confidenceText = (r) => `الثقة: ${CONFIDENCE[r.confidence]}`;
