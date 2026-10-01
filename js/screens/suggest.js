import { state } from '../store.js';
import { esc, delegate, pctBadge, ratingBadge } from '../ui.js';
import { icon } from '../icons.js';
import { MEALS } from '../actions.js';
import { rankSuggestions, mealForHour, pageOf, ENERGY } from '../suggest.js';
import { isWorkDay } from '../profile.js';
import { startTrialFlow } from '../flows.js';
import { now } from '../dates.js';

let energy = 'normal';
let meal = null; // null = from the clock
let page = 0;

function cardHTML(s, i) {
  if (s.type === 'personal') {
    const viaCat = s.res.source === 'category';
    return `<article class="card">
      <h3 class="big" style="font-size:20px">${esc(s.food.name)} ${s.food.favorite ? '⭐' : ''}</h3>
      <div class="food-meta">${pctBadge(s.res.info)}<span class="badge-src badge-mine">${viaCat ? `من فئة ${esc(s.res.catFood.name)} في أكلاتك` : 'مجربة عندك'}</span></div>
      ${s.food.notes ? `<p class="muted small" style="margin-top:6px">${esc(s.food.notes)}</p>` : ''}
      <div class="btn-row" style="margin-top:12px"><button class="btn btn-primary btn-sm" data-act="try" data-i="${i}">جربيها</button></div>
    </article>`;
  }
  const r = s.refItem;
  return `<article class="card">
    <h3 class="big" style="font-size:20px">${esc(r.name)}</h3>
    <div class="food-meta">${ratingBadge(r)}<span class="badge-src">معلومة عامة، مو مجربة عندك</span></div>
    <p class="muted small" style="margin-top:6px">${esc(r.reason)}</p>
    <div class="btn-row" style="margin-top:12px"><button class="btn btn-primary btn-sm" data-act="try" data-i="${i}">جربيها</button></div>
  </article>`;
}

let shown = [];

function render(root) {
  const m = meal || mealForHour(now().getHours());
  const work = isWorkDay();
  const list = rankSuggestions({ meal: m, energy, workDay: work }, state.foods, state.ref);
  shown = pageOf(list, page, 3);
  root.innerHTML = `
    <h1 class="big" style="margin-bottom:12px">اقترح لي</h1>
    <section class="card">
      <p class="sym-label" style="margin-top:0">طاقتك الحين؟</p>
      <div class="seg" role="group" data-tour="suggest-energy">${ENERGY.map((e) => `<button class="chip" data-act="energy" data-id="${e.id}" aria-pressed="${energy === e.id}">${e.label}</button>`).join('')}</div>
      <p class="sym-label">الوجبة</p>
      <div class="chips chips-sm" data-tour="suggest-meal">${MEALS.map((x) => `<button class="chip" data-act="meal" data-id="${x.id}" aria-pressed="${m === x.id}">${x.label}</button>`).join('')}</div>
      <p class="muted small" style="margin-top:10px">اليوم ${work ? 'دوام' : 'إجازة'}${energy === 'tired' || work ? ' · قدّمت لك السريع وأكل البيت ومن برا' : ''}</p>
    </section>
    ${shown.length ? `<div data-tour="suggest-list">${shown.map(cardHTML).join('')}</div>` : `<div class="card empty">
      <p>ما لقيت اقتراح مناسب لهذي الوجبة. جربي أكلات أكثر وقيّميها، وبتطلع لك هنا.</p>
      <button class="btn btn-primary" data-act="search">${icon('search')} أقدر آكل؟</button></div>`}
    ${list.length > 3 ? `<button class="btn btn-secondary btn-block" data-act="next">غيّر</button>` : ''}
  `;
}

export default {
  title: 'اقترح لي',
  mount(root, _p, app) {
    page = 0;
    render(root);
    const off = delegate(root, {
      energy: (el) => { energy = el.dataset.id; page = 0; render(root); },
      meal: (el) => { meal = el.dataset.id; page = 0; render(root); },
      next: () => { page++; render(root); },
      try: (el) => {
        const s = shown[Number(el.dataset.i)];
        if (!s) return;
        startTrialFlow({ name: s.food?.name || s.refItem.name, food: s.food, refItem: s.refItem });
      },
      search: () => app.go('search'),
    });
    return { update: () => render(root), destroy: off };
  },
};
