import { state } from '../store.js';
import { esc, delegate, openSheet } from '../ui.js';
import { icon } from '../icons.js';
import { activeTrials, doneTrials, trialReady, TRIAL_WAIT_MS, findFoodByName } from '../actions.js';
import { SCORE_WORDS, band } from '../scoring.js';
import { RATE_BUTTONS, rateFlow, startTrialFlow, cancelTrialFlow } from '../flows.js';
import { fmtDate, dayKey, now, hoursWord } from '../dates.js';

const when = (iso) => fmtDate(dayKey(new Date(iso)), { year: false });

function activeHTML(t) {
  const ready = trialReady(t);
  const left = Math.ceil((TRIAL_WAIT_MS - (now() - new Date(t.startedAt))) / 3600000);
  return `<article class="card">
    <div class="row-between"><h3 class="big" style="font-size:19px">${esc(t.name)}</h3>
      <button class="btn btn-ghost btn-sm" data-act="cancel" data-id="${esc(t.id)}">إلغاء</button></div>
    <p class="muted small">بديتي ${esc(when(t.startedAt))}</p>
    ${ready ? `<p style="margin:8px 0">كيف كانت الـ24 ساعة بعدها؟</p>${RATE_BUTTONS(t.id)}`
      : `<p class="small" style="margin-top:6px">باقي ${esc(hoursWord(Math.max(1, left)))} وتقدرين تقيّمينها. راقبي جسمك.</p>`}
  </article>`;
}

function doneHTML(t) {
  const b = band(t.score);
  return `<div class="trial-row"><span>${esc(t.name)} <span class="muted small">· ${esc(when(t.ratedAt || t.startedAt))}</span></span>
    <b class="pct-${b}" style="border:0">${SCORE_WORDS[t.score] ?? ''}</b></div>`;
}

function render(root) {
  const act = activeTrials();
  const done = doneTrials();
  root.innerHTML = `
    <div class="row-between" style="margin-bottom:10px">
      <h1 class="big">تجاربي</h1>
      <button class="btn btn-outline btn-sm" data-act="new">${icon('plus')} ابدئي تجربة</button>
    </div>
    <h2 class="section-label">الشغالة</h2>
    ${act.length ? act.map(activeHTML).join('') : `<div class="card empty"><p>ما عندك تجربة شغالة. ابحثي عن أكلة وجربيها، أو ابدئي من "أكلاتي".</p>
      <button class="btn btn-primary" data-act="search">${icon('search')} أقدر آكل؟</button></div>`}
    <h2 class="section-label">المنتهية</h2>
    <section class="card">${done.length ? done.map(doneHTML).join('') : '<p class="muted">ما فيه تجارب منتهية للحين.</p>'}</section>
  `;
}

function newTrialSheet() {
  const names = state.foods.filter((f) => f.kind !== 'category').map((f) => f.name);
  openSheet({
    title: 'تجربة جديدة',
    body: `<label class="field"><span>وش بتجربين؟</span>
      <input class="input" name="n" list="foods-dl" autocomplete="off" enterkeyhint="go" placeholder="اسم الأكلة"></label>
      <datalist id="foods-dl">${names.map((n) => `<option value="${esc(n)}">`).join('')}</datalist>
      <p class="note" style="margin-bottom:14px">كمية صغيرة، وراقبي 24 ساعة.</p>
      <button class="btn btn-primary btn-block" data-go>ابدئي</button>`,
    onMount(el, close) {
      const input = el.querySelector('[name=n]');
      input.focus();
      const go = async () => {
        const name = input.value.trim();
        if (!name) { input.focus(); return; }
        close();
        await startTrialFlow({ name, food: findFoodByName(name) });
      };
      el.querySelector('[data-go]').addEventListener('click', go);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    },
  });
}

export default {
  title: 'تجاربي',
  mount(root, _p, app) {
    render(root);
    const off = delegate(root, {
      rate: (el) => rateFlow(el.dataset.id, Number(el.dataset.score)),
      cancel: (el) => cancelTrialFlow(el.dataset.id),
      new: () => newTrialSheet(),
      search: () => app.go('search'),
    });
    // refresh the "hours left" text while open
    const timer = setInterval(() => render(root), 60000);
    return { update: () => render(root), destroy: () => { off(); clearInterval(timer); } };
  },
};
