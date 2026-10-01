import { state } from '../store.js';
import { esc, delegate, pctBadge, toast } from '../ui.js';
import { icon, starIcon } from '../icons.js';
import { foodPct, comparePct, lastTrialDate, resolve } from '../scoring.js';
import { MEALS, toggleFavorite, setManualPct } from '../actions.js';
import { startTrialFlow, addFoodSheet } from '../flows.js';

const FILTERS = [{ id: 'all', label: 'الكل' }, ...MEALS, { id: 'fav', label: '⭐' }, { id: 'quick', label: 'سريع التحضير' }];
const SORTS = [{ id: 'pct', label: 'النسبة' }, { id: 'name', label: 'الاسم' }, { id: 'recent', label: 'آخر تجربة' }];

let filter = 'all';
let sort = 'pct';

function list() {
  let items = [...state.foods];
  if (filter === 'fav') items = items.filter((f) => f.favorite);
  else if (filter === 'quick') items = items.filter((f) => f.prep === 'quick');
  else if (filter !== 'all') items = items.filter((f) => (f.mealTypes || []).includes(filter));
  if (sort === 'name') items.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  else if (sort === 'recent') items.sort((a, b) => (lastTrialDate(b) || '').localeCompare(lastTrialDate(a) || '') || comparePct(a, b));
  else items.sort(comparePct);
  return items;
}

function itemHTML(f) {
  const info = foodPct(f);
  const res = info.pct == null ? resolve({ food: f }, state.foods, state.ref) : null;
  const viaCat = res?.source === 'category';
  return `<article class="card food-item">
    <button class="food-head" data-act="open" data-id="${esc(f.id)}">
      <span class="food-name">${f.kind === 'category' ? `${icon('grid')}<span class="sr-only">فئة:</span>` : ''}${esc(f.name)}${f.favorite ? ' <span aria-label="مفضلة">⭐</span>' : ''}</span>
      ${icon('chevron')}
    </button>
    <div class="food-meta">
      ${pctBadge(info)}
      ${viaCat ? `<span class="muted small">فئتها ${esc(res.catFood.name)}: ${res.pct}%</span>` : ''}
      ${f.kind === 'category' ? '<span class="tag">فئة</span>' : ''}
      ${f.notes ? `<span class="muted small">${esc(f.notes)}</span>` : ''}
    </div>
    <div class="food-actions">
      <button class="btn btn-secondary btn-sm" data-act="trial" data-id="${esc(f.id)}">سجلي تجربة</button>
      <button class="btn btn-secondary btn-sm" data-act="good" data-id="${esc(f.id)}">نفعني 100%</button>
      <button class="icon-btn star-btn" data-act="fav" data-id="${esc(f.id)}" aria-pressed="${!!f.favorite}" aria-label="مفضلة">${starIcon(f.favorite)}</button>
    </div>
  </article>`;
}

function render(root) {
  const items = list();
  const empty = !state.foods.length;
  root.innerHTML = `
    <div class="row-between" style="margin-bottom:10px">
      <h1 class="big">أكلاتي</h1>
      <button class="btn btn-outline btn-sm" data-act="add">${icon('plus')} أضيفي</button>
    </div>
    ${empty ? '' : `
    <div class="chips chips-scroll" role="group" aria-label="فلترة">
      ${FILTERS.map((x) => `<button class="chip" data-act="filter" data-id="${x.id}" aria-pressed="${filter === x.id}">${x.label}</button>`).join('')}
    </div>
    <div class="row" style="margin:6px 0 12px"><span class="muted small">ترتيب:</span>
      <div class="chips chips-sm">${SORTS.map((x) => `<button class="chip" data-act="sort" data-id="${x.id}" aria-pressed="${sort === x.id}">${x.label}</button>`).join('')}</div>
    </div>`}
    ${empty
      ? `<div class="card empty"><p>ما عندك أكلات للحين. ابحثي عن أكلة وجربيها.</p><button class="btn btn-primary" data-act="search">${icon('search')} أقدر آكل؟</button></div>`
      : items.length ? items.map(itemHTML).join('')
      : `<div class="card empty"><p>ما فيه أكلات بهذا الفلتر.</p><button class="btn btn-secondary" data-act="filter" data-id="all">اعرضي الكل</button></div>`}
  `;
}

export default {
  title: 'أكلاتي',
  mount(root, _p, app) {
    render(root);
    const byId = (el) => state.foods.find((f) => f.id === el.dataset.id);
    const off = delegate(root, {
      open: (el) => app.go(`food/${el.dataset.id}`),
      trial: (el) => { const f = byId(el); if (f) startTrialFlow({ name: f.name, food: f }); },
      good: async (el) => { const f = byId(el); if (f) { await setManualPct(f, 100); toast(`"${f.name}" صارت 100% يدوي`); } },
      fav: (el) => { const f = byId(el); if (f) toggleFavorite(f); },
      filter: (el) => { filter = el.dataset.id; render(root); },
      sort: (el) => { sort = el.dataset.id; render(root); },
      add: () => addFoodSheet(),
      search: () => app.go('search'),
    });
    return { update: () => render(root), destroy: off };
  },
};
