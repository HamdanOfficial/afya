import { state, saveFood } from '../store.js';
import { esc, delegate, pctBadge, ratingBadge, confidenceText, toast } from '../ui.js';
import { icon } from '../icons.js';
import { matchesAny, exactAny } from '../normalize.js';
import { resolve, foodNames, refNames, refById, refRoot, comparePct } from '../scoring.js';
import { buildFood } from '../actions.js';
import { startTrialFlow, addFoodSheet } from '../flows.js';

let lastQuery = '';

/**
 * personal: her own entries (or reference items covered by her category)
 * general:  reference groups [{ root, matched:Set<id> }] — a base food with its variants
 */
export function searchAll(q) {
  const personal = [];
  const seenFood = new Set();
  for (const f of [...state.foods].sort(comparePct)) {
    if (matchesAny(q, foodNames(f))) {
      personal.push({ food: f, res: resolve({ food: f }, state.foods, state.ref) });
      seenFood.add(f.id);
    }
  }
  const groups = new Map();
  const refs = state.ref.items.filter((r) => matchesAny(q, refNames(r)));
  refs.sort((a, b) => Number(exactAny(q, refNames(b))) - Number(exactAny(q, refNames(a))));
  for (const r of refs) {
    const res = resolve({ refItem: r }, state.foods, state.ref);
    if (res.food) {
      if (!seenFood.has(res.food.id)) {
        personal.push({ refItem: r, food: res.food, res });
        seenFood.add(res.food.id);
      }
      continue;
    }
    if (res.source === 'category') {
      personal.push({ refItem: r, food: null, res });
      continue;
    }
    const root = refRoot(r, state.ref);
    if (!groups.has(root.id)) groups.set(root.id, { root, matched: new Set() });
    groups.get(root.id).matched.add(r.id);
  }
  return { personal, general: [...groups.values()] };
}

function refDetails(r, { compact = false } = {}) {
  return `<div class="food-meta">${ratingBadge(r)}<span class="muted small">${esc(confidenceText(r))}</span></div>
    <p class="reason ${compact ? 'small' : ''}">${esc(r.reason)}</p>
    ${!compact && r.rating !== 'green' && r.alternative ? `<p class="small"><b>البديل:</b> ${esc(r.alternative)}</p>` : ''}`;
}

function personalCard({ food, refItem, res }) {
  const name = food ? food.name : refItem.name;
  let body = '';
  if (res.source === 'self') {
    body = `<div class="food-meta">${pctBadge(res.info)}<span class="badge-src badge-mine">مجربة عندك</span></div>`;
  } else if (res.source === 'category') {
    body = `<div class="food-meta">${pctBadge(res.info)}<span class="badge-src badge-mine">مجربة عندك</span></div>
      <p class="small" style="margin-top:6px">من فئة ${esc(res.catFood.name)} في أكلاتك</p>`;
  } else {
    body = `<div class="food-meta">${pctBadge(null)}<span class="badge-src badge-mine">في أكلاتك</span></div>
      ${res.refItem ? `<div class="hr"></div><span class="badge-src">معلومة عامة</span>${refDetails(res.refItem)}` : ''}`;
  }
  const notes = food?.notes || res.catFood?.notes;
  return `<article class="card result-card">
    <h3 class="big" style="font-size:20px">${esc(name)}${food?.kind === 'category' ? ' <span class="tag">فئة</span>' : ''}</h3>
    ${body}
    ${notes ? `<p class="muted small" style="margin-top:6px">${esc(notes)}</p>` : ''}
    <div class="btn-row" style="margin-top:12px">
      ${food?.kind === 'category' ? '' : `<button class="btn btn-primary btn-sm" data-act="try" data-food="${esc(food?.id || '')}" data-ref="${esc(refItem?.id || '')}">جربيها</button>`}
      ${food ? `<button class="btn btn-secondary btn-sm" data-act="open" data-food="${esc(food.id)}">التفاصيل</button>`
        : `<button class="btn btn-secondary btn-sm" data-act="add" data-ref="${esc(refItem.id)}">أضيفيها لأكلاتي</button>`}
    </div>
  </article>`;
}

function variantRow(v, matched) {
  const res = resolve({ refItem: v }, state.foods, state.ref);
  const mine = res.source === 'self' || res.source === 'category';
  return `<div class="variant ${matched ? 'variant-hit' : ''}">
    <div class="row-between" style="align-items:flex-start">
      <b>${esc(v.name)}</b>
      ${mine ? pctBadge(res.info) : ratingBadge(v)}
    </div>
    <p class="small muted" style="margin-top:2px">${mine ? (res.source === 'category' ? `من فئة ${esc(res.catFood.name)} في أكلاتك` : 'مجربة عندك') : esc(v.reason)}</p>
    <div class="variant-actions">
      <button class="link-btn" data-act="try" data-ref="${esc(v.id)}" data-food="${esc(res.food?.id || '')}">جربيها</button>
      ${res.food ? `<button class="link-btn" data-act="open" data-food="${esc(res.food.id)}">التفاصيل</button>`
        : `<button class="link-btn" data-act="add" data-ref="${esc(v.id)}">أضيفيها لأكلاتي</button>`}
    </div>
  </div>`;
}

function generalCard({ root, matched }) {
  // Highlight variants only when the search was specific ("بطاطس مقلية"), not for the general name ("بطاطس").
  const specific = !matched.has(root.id);
  const variants = [...root.variants].sort((a, b) => Number(matched.has(b.id)) - Number(matched.has(a.id)));
  const rootRes = resolve({ refItem: root }, state.foods, state.ref);
  return `<article class="card result-card">
    <div class="row-between"><h3 class="big" style="font-size:20px">${esc(root.name)}</h3><span class="badge-src">معلومة عامة</span></div>
    ${refDetails(root)}
    ${variants.length ? `<p class="sym-label">حسب طريقة التحضير</p><div class="variants">${variants.map((v) => variantRow(v, specific && matched.has(v.id))).join('')}</div>` : ''}
    <div class="btn-row" style="margin-top:12px">
      <button class="btn btn-primary btn-sm" data-act="try" data-ref="${esc(root.id)}" data-food="${esc(rootRes.food?.id || '')}">جربيها</button>
      <button class="btn btn-secondary btn-sm" data-act="add" data-ref="${esc(root.id)}">أضيفيها لأكلاتي</button>
    </div>
  </article>`;
}

function renderResults(box, q) {
  if (!q.trim()) {
    box.innerHTML = `<p class="muted" style="text-align:center;padding:24px 8px">اكتبي اسم أي أكلة أو مشروب أو بهار، وأقولك وش أعرف عنه.<br><span class="small">أكثر من 400 أكلة ومشروب، ولكل وحدة طرق التحضير المختلفة.</span></p>`;
    return;
  }
  const { personal, general } = searchAll(q);
  if (!personal.length && !general.length) {
    box.innerHTML = `<div class="card empty">
      <p>ما عندي معلومة مؤكدة عن هذي. إذا تبين تجربينها، كمية صغيرة وراقبي 24 ساعة.</p>
      <button class="btn btn-primary" data-act="add-try">أضيفيها وجربيها</button>
    </div>`;
    return;
  }
  box.innerHTML = `
    ${personal.length ? `<h2 class="section-label">من أكلاتك</h2>${personal.map(personalCard).join('')}` : ''}
    ${general.length ? `<h2 class="section-label">معلومة عامة</h2>${general.map(generalCard).join('')}` : ''}`;
}

export default {
  title: 'أقدر آكل؟',
  mount(root, _p, app) {
    root.innerHTML = `
      <div class="search-wrap" data-tour="search-input">
        ${icon('search')}
        <label class="sr-only" for="q">ابحثي عن أكلة</label>
        <input id="q" class="input search-input" type="search" placeholder="وش تبين تاكلين أو تشربين؟" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="search" value="${esc(lastQuery)}">
      </div>
      <div data-results></div>`;
    const input = root.querySelector('#q');
    const box = root.querySelector('[data-results]');
    const draw = () => renderResults(box, input.value);
    input.addEventListener('input', () => { lastQuery = input.value; draw(); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
    draw();
    if (!app.touring) input.focus({ preventScroll: true });

    const off = delegate(root, {
      try: (el) => {
        const food = state.foods.find((f) => f.id === el.dataset.food) || null;
        const refItem = refById(el.dataset.ref, state.ref);
        startTrialFlow({ name: food?.name || refItem?.name, food, refItem });
      },
      open: (el) => app.go(`food/${el.dataset.food}`),
      add: async (el) => {
        const r = refById(el.dataset.ref, state.ref);
        if (!r) return;
        const f = await saveFood(buildFood({ name: r.name, refItem: r }));
        toast(`انضافت "${f.name}" لأكلاتك`);
      },
      'add-try': () => addFoodSheet(input.value.trim(), { thenTrial: true }),
    });
    return { update: draw, destroy: off };
  },
};
