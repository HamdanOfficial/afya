import { state, saveFood, removeFood } from '../store.js';
import { esc, delegate, pctBadge, chips, bindChips, snackbar, ratingBadge, confidenceText } from '../ui.js';
import { icon, starIcon } from '../icons.js';
import { foodPct, refById, refFor, SCORE_WORDS, resolve } from '../scoring.js';
import { MEALS, PREP, SOURCES, linkToRef } from '../actions.js';
import { startTrialFlow } from '../flows.js';
import { fmtDate, dayKey } from '../dates.js';

function render(root, food) {
  const info = foodPct(food);
  const r = refById(food.refId, state.ref);
  const res = info.pct == null ? resolve({ food }, state.foods, state.ref) : null;
  const trials = [...(food.trials || [])].map((t, i) => ({ ...t, i })).sort((a, b) => b.date.localeCompare(a.date));
  const cats = state.ref.categories;
  root.innerHTML = `
    <section class="card">
      <div class="row-between">
        <div class="food-meta" style="margin:0">${pctBadge(info)}</div>
        <button class="icon-btn star-btn" data-act="fav" aria-pressed="${!!food.favorite}" aria-label="مفضلة">${starIcon(food.favorite)}</button>
      </div>
      ${res?.source === 'category' ? `<p class="muted small" style="margin-top:6px">من فئة ${esc(res.catFood.name)} في أكلاتك: ${res.pct}%</p>` : ''}
      ${r ? `<div class="food-meta">${ratingBadge(r)}<span class="badge-src">معلومة عامة</span><span class="muted small">${esc(confidenceText(r))}</span></div><p class="muted small" style="margin-top:4px">${esc(r.reason)}</p>` : ''}
      <div class="btn-row" style="margin-top:12px">
        <button class="btn btn-primary btn-sm" data-act="trial">سجلي تجربة</button>
      </div>
    </section>

    <section class="card">
      <label class="field"><span>الاسم</span><input class="input" data-field="name" value="${esc(food.name)}"></label>
      <div class="field"><span>النوع</span>${chips('kind', [{ id: 'item', label: 'أكلة' }, { id: 'category', label: 'فئة' }], food.kind)}</div>
      ${food.kind === 'item' ? `<label class="field"><span>الفئة</span>
        <select class="input" data-field="category">
          <option value="">بدون</option>
          ${cats.map((c) => `<option ${food.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
          ${food.category && !cats.includes(food.category) ? `<option selected>${esc(food.category)}</option>` : ''}
        </select></label>` : ''}
      <div class="field"><span>نوع الوجبة</span>${chips('mealTypes', MEALS, food.mealTypes, { multi: true, small: true })}</div>
      <div class="field"><span>وقت التحضير</span>${chips('prep', PREP, food.prep, { small: true })}</div>
      <div class="field"><span>المصدر</span>${chips('source', SOURCES, food.source, { small: true })}</div>
      <label class="field"><span>ملاحظات</span><textarea class="input" data-field="notes" placeholder="مثلاً: بدون طماطم">${esc(food.notes)}</textarea></label>
      <div class="field"><span>نسبة يدوية (اختيارية)</span>
        <div class="row"><input class="input" type="number" inputmode="numeric" min="0" max="100" data-field="manualPct" value="${food.manualPct ?? ''}" placeholder="من التجارب" style="max-width:140px"><span>%</span>
        ${food.manualPct != null ? '<button class="btn btn-ghost btn-sm" data-act="clear-manual">ارجعي للحساب من التجارب</button>' : ''}</div>
      </div>
    </section>

    <h2 class="section-label">سجل التجارب</h2>
    <section class="card">
      ${trials.length ? trials.map((t) => `<div class="trial-row"><span>${esc(fmtDate(dayKey(new Date(t.date))))}${t.note ? ` <span class="muted small">(${esc(t.note)})</span>` : ''}</span>
        <span class="row"><b>${SCORE_WORDS[t.score]}</b><button class="icon-btn" data-act="rm-trial" data-i="${t.i}" aria-label="احذفي هذي التجربة">${icon('x')}</button></span></div>`).join('')
        : '<p class="muted">ما فيه تجارب للحين.</p>'}
    </section>

    <button class="btn btn-danger btn-block" data-act="delete" style="margin-top:8px">${icon('trash')} احذفيها</button>
  `;
}

export default {
  title: 'التفاصيل',
  back: 'foods',
  mount(root, params, app) {
    const id = params[0];
    const get = () => state.foods.find((f) => f.id === id);
    if (!get()) { app.go('foods', { replace: true }); return {}; }
    const save = (patch) => saveFood({ ...get(), ...patch });

    const draw = () => {
      const f = get();
      if (!f) return;
      render(root, f);
      app.setTitle(f.name);
      bindChips(root, (k, v) => save({ [k]: v ?? (k === 'mealTypes' ? [] : k === 'kind' ? 'item' : '') }));
    };
    draw();

    const onChange = (e) => {
      const el = e.target.closest('[data-field]');
      if (!el) return;
      const k = el.dataset.field;
      if (k === 'manualPct') {
        const v = el.value === '' ? null : Math.max(0, Math.min(100, Math.round(Number(el.value))));
        save({ manualPct: Number.isFinite(v) ? v : null });
      } else if (k === 'name') {
        const name = el.value.trim();
        if (!name) { el.value = get().name; return; }
        const f = { ...get(), name };
        if (refFor(name, state.ref)) { f.refId = null; f.aliases = []; linkToRef(f); }
        saveFood(f);
      } else save({ [k]: el.value });
    };
    root.addEventListener('change', onChange);

    const off = delegate(root, {
      fav: () => save({ favorite: !get().favorite }),
      trial: () => startTrialFlow({ name: get().name, food: get() }),
      'clear-manual': () => save({ manualPct: null }),
      'rm-trial': (el) => {
        const f = get();
        const trials = [...f.trials];
        trials.splice(Number(el.dataset.i), 1);
        save({ trials });
        snackbar('انحذفت التجربة', { onAction: () => saveFood(f) });
      },
      delete: async () => {
        const f = get();
        await removeFood(f.id);
        app.go('foods', { replace: true });
        snackbar(`تم الحذف · ${f.name}`, { onAction: () => saveFood(f) });
      },
    });
    return {
      update: () => {
        if (!get()) return;
        const a = document.activeElement;
        if (a && root.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return; // don't yank the keyboard
        draw();
      },
      destroy: () => { off(); root.removeEventListener('change', onChange); },
    };
  },
};
