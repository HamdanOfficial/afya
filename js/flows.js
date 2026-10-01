// Multi-step interactions shared by several screens.
import { state, saveFood, setSetting, getSetting, removeTrial, saveTrial, addTreatment } from './store.js';
import {
  activeTrials, startTrial, rateTrial, setManualPct, buildFood, findFoodByName, applyProfileFoods,
  MEALS, PREP, SOURCES,
} from './actions.js';
import { openSheet, ask, snackbar, toast, esc, chips, bindChips } from './ui.js';
import { APPROX_BUCKETS, approxDate, dayKey } from './dates.js';
import { PROFILE_QUESTIONS, ENERGY_TIMES, profile, isAnswered, DEFAULT_DURATION } from './profile.js';

export const RATE_BUTTONS = (id) => `
  <div class="btn-row rate-row">
    <button class="btn btn-secondary btn-sm" data-act="rate" data-id="${esc(id)}" data-score="100">ما تعبتني</button>
    <button class="btn btn-secondary btn-sm" data-act="rate" data-id="${esc(id)}" data-score="50">تعب خفيف</button>
    <button class="btn btn-secondary btn-sm" data-act="rate" data-id="${esc(id)}" data-score="0">تعبتني</button>
  </div>`;

export async function startTrialFlow({ name, food = null, refItem = null }) {
  if (activeTrials().length) {
    const go = await ask({
      title: 'عندك تجربة شغالة',
      text: 'الأفضل تجربين أكلة وحدة بس في نفس الوقت عشان تعرفين وش السبب.',
      buttons: [
        { label: 'ابدئي على كل حال', value: true, primary: true },
        { label: 'خليها بعدين', value: false },
      ],
    });
    if (!go) return null;
  }
  const t = await startTrial({ name, food, refItem });
  snackbar(`بدأت تجربة "${t.name}". كمية صغيرة، وقيّميها بعد 24 ساعة.`, {
    onAction: () => removeTrial(t.id),
  });
  return t;
}

export async function rateFlow(trialId, score) {
  const { food, askManual } = await rateTrial(trialId, score);
  if (!food) return;
  if (askManual) {
    const back = await ask({
      title: `نسبة "${food.name}" محطوطة يدوي`,
      text: 'تبين ترجعين للحساب من التجارب، أو تبقين على نسبتك؟',
      buttons: [
        { label: 'أرجع للحساب من التجارب', value: true, primary: true },
        { label: 'أبقى على نسبتي', value: false },
      ],
    });
    if (back) await setManualPct(food, null);
  }
  toast('انحفظ التقييم ✔️');
}

export async function cancelTrialFlow(trialId) {
  const t = state.trials.find((x) => x.id === trialId);
  if (!t) return;
  await removeTrial(trialId);
  snackbar('انلغت التجربة', { onAction: () => saveTrial(t) });
}

// ---------- add food ----------
export function addFoodSheet(prefill = '', { thenTrial = false } = {}) {
  const draft = { name: prefill, kind: 'item', mealTypes: [], prep: '', source: '', favorite: false };
  openSheet({
    title: thenTrial ? 'أضيفيها وجربيها' : 'أضيفي أكلة',
    body: `
      <label class="field"><span>الاسم</span><input class="input" name="name" value="${esc(prefill)}" autocomplete="off" enterkeyhint="done"></label>
      <div class="field"><span>النوع</span>${chips('kind', [{ id: 'item', label: 'أكلة' }, { id: 'category', label: 'فئة (مثل الحوامض)' }], 'item')}</div>
      <div class="field"><span>نوع الوجبة</span>${chips('mealTypes', MEALS, [], { multi: true, small: true })}</div>
      <div class="field"><span>وقت التحضير</span>${chips('prep', PREP, '', { small: true })}</div>
      <div class="field"><span>المصدر</span>${chips('source', SOURCES, '', { small: true })}</div>
      <p class="note" data-dup hidden></p>
      <button class="btn btn-primary btn-block" data-save>${thenTrial ? 'أضيفي وابدئي التجربة' : 'أضيفي'}</button>`,
    onMount(el, close) {
      const nameInput = el.querySelector('[name=name]');
      if (!prefill) nameInput.focus();
      bindChips(el, (k, v) => { draft[k] = v ?? (k === 'mealTypes' ? [] : ''); });
      el.querySelector('[data-save]').addEventListener('click', async () => {
        const name = nameInput.value.trim();
        if (!name) { nameInput.focus(); return; }
        let food = draft.kind === 'item' ? findFoodByName(name) : null;
        if (food) {
          const dup = el.querySelector('[data-dup]');
          if (dup.hidden) { dup.hidden = false; dup.textContent = `"${food.name}" موجودة في أكلاتك. اضغطي مرة ثانية عشان تكملين عليها.`; return; }
        } else {
          food = buildFood({ ...draft, name, kind: draft.kind || 'item' });
          await saveFood(food);
        }
        close();
        if (thenTrial) await startTrialFlow({ name: food.name, food });
        else toast(`انضافت "${food.name}" لأكلاتك`);
      });
    },
  });
}

// ---------- date with "ما أتذكر بالضبط" ----------
// value: { date, approx, bucket }
export function dateFieldHTML(name, value, label) {
  const v = value || {};
  return `
    <div class="field" data-datefield="${esc(name)}">
      <span>${esc(label)}</span>
      <input class="input" type="date" max="${dayKey()}" value="${v.approx ? '' : esc(v.date || '')}" ${v.approx ? 'hidden' : ''}>
      <button type="button" class="link-btn" data-approx-toggle>${v.approx ? 'أعرف التاريخ بالضبط' : 'ما أتذكر بالضبط'}</button>
      <div data-approx ${v.approx ? '' : 'hidden'}>${chips(`${name}-bucket`, APPROX_BUCKETS, v.bucket || '')}</div>
    </div>`;
}

// Reads the current value of a date field (or null).
export function bindDateField(root, name) {
  const box = root.querySelector(`[data-datefield="${name}"]`);
  const input = box.querySelector('input[type=date]');
  const approxBox = box.querySelector('[data-approx]');
  const toggle = box.querySelector('[data-approx-toggle]');
  let approx = !approxBox.hidden;
  let bucket = approxBox.querySelector('.chip[aria-pressed="true"]')?.dataset.id || '';
  toggle.addEventListener('click', () => {
    approx = !approx;
    input.hidden = approx;
    approxBox.hidden = !approx;
    toggle.textContent = approx ? 'أعرف التاريخ بالضبط' : 'ما أتذكر بالضبط';
  });
  bindChips(approxBox, (_k, v) => { bucket = v || ''; });
  return () => {
    if (approx) return bucket ? { date: approxDate(bucket), approx: true, bucket } : null;
    return input.value ? { date: input.value, approx: false } : null;
  };
}

// ---------- treatment ----------
export function editTreatmentSheet({ fresh = false } = {}) {
  const cur = fresh ? null : getSetting('treatment');
  openSheet({
    title: fresh ? 'بديت علاج جديد' : 'تعديل العلاج',
    body: `
      ${dateFieldHTML('start', fresh ? { date: dayKey() } : cur, 'متى بديتي الدواء؟')}
      <label class="field"><span>كم مدة العلاج؟ (بالأيام)</span><input class="input" type="number" inputmode="numeric" min="1" max="365" name="dur" value="${esc(cur?.durationDays || DEFAULT_DURATION)}"></label>
      <button class="btn btn-primary btn-block" data-save>حفظ</button>`,
    onMount(el, close) {
      const read = bindDateField(el, 'start');
      el.querySelector('[data-save]').addEventListener('click', async () => {
        const v = read();
        if (!v) { toast('حددي التاريخ أول'); return; }
        const dur = Math.max(1, Math.min(365, parseInt(el.querySelector('[name=dur]').value, 10) || DEFAULT_DURATION));
        if (fresh) await saveOldTreatment();
        await setSetting('treatment', { ...v, durationDays: dur });
        close();
        toast('انحفظ ✔️');
      });
    },
  });
}

async function saveOldTreatment() {
  const old = getSetting('treatment');
  if (old?.date) await addTreatment({ ...old, endedAt: dayKey() });
}

export function editAntibioticSheet() {
  const cur = getSetting('antibiotic');
  openSheet({
    title: 'المضاد الحيوي',
    body: `${dateFieldHTML('ab', cur, 'متى خلصتي آخر مضاد؟')}<button class="btn btn-primary btn-block" data-save>حفظ</button>`,
    onMount(el, close) {
      const read = bindDateField(el, 'ab');
      el.querySelector('[data-save]').addEventListener('click', async () => {
        const v = read();
        if (!v) { toast('حددي التاريخ أول'); return; }
        await setSetting('antibiotic', v);
        close();
        toast('انحفظ ✔️');
      });
    },
  });
}

// ---------- "كملي ملفك" questions ----------
export function nextUnanswered() {
  const p = profile();
  return PROFILE_QUESTIONS.find((q) => !isAnswered(q, p)) || null;
}

async function saveProfile(patch, key) {
  const p = { ...profile(), ...patch };
  p.answered = [...new Set([...(p.answered || []), key])];
  await setSetting('profile', p);
}

export function profileQuestionSheet(q, { chain = false } = {}) {
  const p = profile();
  let body = '';
  let value;
  if (q.type === 'text') {
    body = `<textarea class="input" name="v" placeholder="اكتبي هنا…">${esc(p[q.key] || '')}</textarea>`;
  } else if (q.type === 'single') {
    value = p[q.key] || '';
    body = chips('v', q.options, value);
  } else if (q.type === 'multi') {
    value = p[q.key] || [];
    body = chips('v', q.options, value, { multi: true });
  } else if (q.type === 'energy') {
    value = { energyHigh: p.energyHigh || [], energyLow: p.energyLow || [] };
    body = `<div class="field"><span>طاقتي عالية</span>${chips('energyHigh', ENERGY_TIMES, value.energyHigh, { multi: true })}</div>
            <div class="field"><span>أكون تعبانة</span>${chips('energyLow', ENERGY_TIMES, value.energyLow, { multi: true })}</div>`;
  } else if (q.type === 'foods') {
    body = `<p class="note" style="margin-bottom:10px">اكتبي أكلة وحدة واضغطي "زيدي". تقدرين تكتبين فئة مثل "الحوامض".</p>
      <div class="row"><input class="input" name="item" placeholder="مثلاً: رز" autocomplete="off" enterkeyhint="done"><button class="btn btn-secondary" data-add>زيدي</button></div>
      <div class="chips" data-list style="margin-top:10px"></div>`;
  }
  const isFoods = q.type === 'foods';
  openSheet({
    title: q.title,
    body: `${body}
      <div class="btn-col" style="margin-top:18px">
        <button class="btn btn-primary" data-save>حفظ</button>
        ${isFoods ? '<button class="btn btn-secondary" data-none>ما عندي</button>' : ''}
      </div>`,
    onMount(el, close) {
      const items = [];
      if (q.type === 'single' || q.type === 'multi') bindChips(el, (_k, v) => { value = v; });
      if (q.type === 'energy') bindChips(el, (k, v) => { value[k] = v; });
      if (isFoods) {
        const input = el.querySelector('[name=item]');
        const list = el.querySelector('[data-list]');
        const add = () => {
          const v = input.value.trim();
          if (!v) return;
          items.push(v);
          input.value = '';
          list.innerHTML = items.map((x, i) => `<button type="button" class="chip" data-rm="${i}" aria-label="شيلي ${esc(x)}">${esc(x)} ✕</button>`).join('');
          input.focus();
        };
        el.querySelector('[data-add]').addEventListener('click', add);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
        list.addEventListener('click', (e) => {
          const b = e.target.closest('[data-rm]');
          if (!b) return;
          items.splice(Number(b.dataset.rm), 1);
          b.remove();
          list.querySelectorAll('[data-rm]').forEach((c, i) => { c.dataset.rm = i; });
        });
        el.querySelector('[data-none]').addEventListener('click', async () => {
          await saveProfile({}, q.key);
          close();
          if (chain) chainNext();
        });
      }
      el.querySelector('[data-save]').addEventListener('click', async () => {
        if (q.type === 'text') await saveProfile({ [q.key]: el.querySelector('[name=v]').value.trim() }, q.key);
        else if (q.type === 'energy') await saveProfile(value, q.key);
        else if (isFoods) {
          const pending = el.querySelector('[name=item]').value.trim();
          if (pending) items.push(pending);
          if (!items.length) { toast('زيدي أكلة، أو اضغطي "ما عندي"'); return; }
          await applyProfileFoods(q.foodKind, items);
          await saveProfile({}, q.key);
        } else await saveProfile({ [q.key]: value }, q.key);
        close();
        toast('انحفظ ✔️');
        if (chain) chainNext();
      });
    },
  });
}

function chainNext() {
  const n = nextUnanswered();
  if (n) setTimeout(() => profileQuestionSheet(n, { chain: true }), 150);
}
