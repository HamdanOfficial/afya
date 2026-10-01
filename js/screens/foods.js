import { state } from '../store.js';
import { esc, delegate, pctBadge, toast } from '../ui.js';
import { icon, starIcon } from '../icons.js';
import { foodPct, lastTrialDate, resolve } from '../scoring.js';
import { MEALS, toggleFavorite, setManualPct } from '../actions.js';
import { startTrialFlow, addFoodSheet } from '../flows.js';

const FILTERS = [{ id: 'all', label: 'الكل' }, ...MEALS, { id: 'fav', label: '⭐' }, { id: 'quick', label: 'سريع التحضير' }];
// Each sort has a default direction and plain words for both directions.
const SORTS = [
  { id: 'pct', label: 'النسبة', desc: 'الأعلى أولاً', asc: 'الأقل أولاً', defaultDir: 'desc' },
  { id: 'name', label: 'الاسم', asc: 'من أ إلى ي', desc: 'من ي إلى أ', defaultDir: 'asc' },
  { id: 'recent', label: 'آخر تجربة', desc: 'الأحدث أولاً', asc: 'الأقدم أولاً', defaultDir: 'desc' },
  { id: 'count', label: 'عدد التجارب', desc: 'الأكثر أولاً', asc: 'الأقل أولاً', defaultDir: 'desc' },
];
const SORT_KEY = 'afya-foods-sort';

let filter = 'all';
let sort = 'pct';
let dir = 'desc';
try {
  const saved = JSON.parse(localStorage.getItem(SORT_KEY) || 'null');
  if (saved && SORTS.some((s) => s.id === saved.sort)) ({ sort, dir } = saved);
} catch { /* ignore */ }
const saveSort = () => { try { localStorage.setItem(SORT_KEY, JSON.stringify({ sort, dir })); } catch { /* ignore */ } };

// Items without a value (never tried) always go last, whatever the direction.
function byValue(get, d) {
  return (a, b) => {
    const va = get(a);
    const vb = get(b);
    if (va == null && vb == null) return a.name.localeCompare(b.name, 'ar');
    if (va == null) return 1;
    if (vb == null) return -1;
    const c = typeof va === 'string' ? va.localeCompare(vb, 'ar') : va - vb;
    return (d === 'asc' ? c : -c) || a.name.localeCompare(b.name, 'ar');
  };
}

function list() {
  let items = [...state.foods];
  if (filter === 'fav') items = items.filter((f) => f.favorite);
  else if (filter === 'quick') items = items.filter((f) => f.prep === 'quick');
  else if (filter !== 'all') items = items.filter((f) => (f.mealTypes || []).includes(filter));
  const getters = {
    pct: (f) => foodPct(f).pct,
    name: (f) => f.name,
    recent: (f) => lastTrialDate(f),
    count: (f) => (f.trials?.length ? f.trials.length : null),
  };
  items.sort(byValue(getters[sort], dir));
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
      <button class="btn btn-outline btn-sm" data-act="add" data-tour="foods-add">${icon('plus')} أضيفي</button>
    </div>
    ${empty ? '' : `
    <div class="chips chips-scroll" role="group" aria-label="فلترة" data-tour="foods-filter">
      ${FILTERS.map((x) => `<button class="chip" data-act="filter" data-id="${x.id}" aria-pressed="${filter === x.id}">${x.label}</button>`).join('')}
    </div>
    <div class="sort-bar" data-tour="foods-sort">
      <span class="muted small">رتّبي حسب</span>
      <div class="chips chips-sm">${SORTS.map((x) => `<button class="chip" data-act="sort" data-id="${x.id}" aria-pressed="${sort === x.id}">${x.label}</button>`).join('')}</div>
      <button class="btn btn-secondary btn-sm sort-dir" data-act="dir" aria-label="اعكسي الترتيب">${icon(dir === 'asc' ? 'arrowUp' : 'arrowDown')} ${SORTS.find((s) => s.id === sort)[dir]}</button>
    </div>`}
    ${empty
      ? `<div class="card empty"><p>ما عندك أكلات للحين. ابحثي عن أكلة وجربيها.</p><button class="btn btn-primary" data-act="search">${icon('search')} أقدر آكل؟</button></div>`
      : items.length ? items.map(itemHTML).join('').replace('class="card food-item"', 'class="card food-item" data-tour="foods-item"')
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
      sort: (el) => {
        const s = SORTS.find((x) => x.id === el.dataset.id);
        if (sort === s.id) dir = dir === 'asc' ? 'desc' : 'asc'; // tapping the active one flips it
        else { sort = s.id; dir = s.defaultDir; }
        saveSort();
        render(root);
      },
      dir: () => { dir = dir === 'asc' ? 'desc' : 'asc'; saveSort(); render(root); },
      add: () => addFoodSheet(),
      search: () => app.go('search'),
    });
    return { update: () => render(root), destroy: off };
  },
};
