import { state, getDay, updateDay, dismissAlert } from '../store.js';
import { dayKey, addDays, fmtDate, now, daysWord, cupsWord } from '../dates.js';
import { esc, delegate, snackbar, pctBadge, ratingBadge } from '../ui.js';
import { icon } from '../icons.js';
import { activeAlerts, LEVELS, RED_FLAGS } from '../alerts.js';
import { readyTrials } from '../actions.js';
import { treatmentStatus, water, isWorkDay, scheduledWorkDay, profileProgress } from '../profile.js';
import { rankSuggestions, mealForHour, pageOf } from '../suggest.js';
import { MEALS, labelOf } from '../actions.js';
import { RATE_BUTTONS, rateFlow, editTreatmentSheet, profileQuestionSheet, nextUnanswered } from '../flows.js';
import { exportBackup } from '../backup.js';

let suggestPage = 0;

const seg = (name, value) => `<div class="seg" role="group">${LEVELS.map((l) =>
  `<button type="button" class="chip" data-act="level" data-name="${name}" data-val="${l.id}" aria-pressed="${value === l.id}">${l.label}</button>`).join('')}</div>`;

function alertsHTML(app) {
  let html = '';
  if (app.updateReady) {
    html += `<div class="update-bar"><span>فيه تحديث جديد</span><button class="btn btn-primary btn-sm" data-act="update">حدّثي</button></div>`;
  }
  for (const a of activeAlerts()) {
    const medical = a.kind === 'medical';
    html += `<div class="alert ${medical ? '' : 'alert-info'}" role="alert">
      <div class="alert-title">${icon(medical ? 'alert' : 'copy')}${esc(a.title)}</div>
      <p>${esc(a.text)}</p>
      <div class="btn-row">
        ${medical
          ? `<button class="btn btn-secondary btn-sm" data-act="doctor">متى أراجع الطبيب؟</button>
             <button class="btn btn-danger btn-sm" data-act="dismiss" data-key="${esc(a.key)}">فهمت</button>`
          : `<button class="btn btn-primary btn-sm" data-act="export">صدّري الحين</button>
             <button class="btn btn-secondary btn-sm" data-act="dismiss" data-key="${esc(a.key)}">بعدين</button>`}
      </div>
    </div>`;
  }
  return html;
}

function trialsHTML() {
  const ready = readyTrials();
  if (!ready.length) return '';
  return ready.map((t) => `
    <section class="card">
      <h2 class="card-title">${icon('trials')}عندك تجربة تحتاج تقييم</h2>
      <p><b>${esc(t.name)}</b> <span class="muted small">· بديتي ${esc(fmtDate(dayKey(new Date(t.startedAt)), { year: false }))}</span></p>
      <p class="muted small" style="margin-bottom:8px">كيف كانت الـ24 ساعة بعدها؟</p>
      ${RATE_BUTTONS(t.id)}
    </section>`).join('');
}

function treatmentHTML(tr) {
  if (!tr.set) {
    return `<section class="card"><h2 class="card-title">${icon('pill')}علاجي</h2>
      <p class="muted">ما حددتي متى بديتي علاج المثانة العصبية.</p>
      <div class="btn-row" style="margin-top:10px"><button class="btn btn-secondary btn-sm" data-act="edit-treatment">حددي التاريخ</button></div></section>`;
  }
  const ap = tr.approx ? ' تقريباً' : '';
  if (tr.ended) {
    return `<section class="card"><h2 class="card-title">${icon('pill')}علاجي</h2>
      <p class="big" style="font-size:19px">خلصت مدة العلاج قبل ${tr.endedDaysAgo === 0 ? 'اليوم' : esc(daysWord(tr.endedDaysAgo))}${ap}</p>
      <div class="btn-row" style="margin-top:10px">
        <button class="btn btn-primary btn-sm" data-act="new-treatment">بديت علاج جديد</button>
        <button class="btn btn-secondary btn-sm" data-act="edit-treatment">تعديل</button>
      </div></section>`;
  }
  return `<section class="card"><h2 class="card-title">${icon('pill')}علاجي</h2>
    <div class="row-between">
      <p>اليوم <b class="big">${tr.dayN}</b> من <b>${tr.total}</b>${ap} من علاج المثانة العصبية</p>
      <button class="btn btn-ghost btn-sm" data-act="edit-treatment">تعديل</button>
    </div>
    <div class="progress" style="margin-top:8px" aria-hidden="true"><div style="width:${Math.min(100, (tr.dayN / tr.total) * 100)}%"></div></div>
  </section>`;
}

function waterHTML(d) {
  const w = water();
  const n = d.water || 0;
  const pct = Math.min(100, (n / Math.max(1, w.goalCups)) * 100);
  return `<section class="card">
    <h2 class="card-title">${icon('drop')}الماء</h2>
    <p><b class="big">${n}</b> من ${w.goalCups} أكواب · ${n * w.cupMl} مل</p>
    <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${w.goalCups}" aria-valuenow="${n}" aria-label="الماء"><div style="width:${pct}%"></div></div>
    <div class="water-row">
      <button class="btn btn-primary water-add" data-act="water-add">${icon('plus')} كوب</button>
      <button class="btn btn-secondary water-minus" data-act="water-minus" aria-label="نقصي كوب" ${n ? '' : 'disabled'}>${icon('minus')}</button>
    </div>
    <p class="note">رشفات متوزعة على اليوم أفضل من كمية كبيرة مرة وحدة. خففي الشرب قبل النوم بساعتين. لون البول الأصفر الفاتح مؤشر جيد.</p>
  </section>`;
}

function suggestionHTML() {
  const meal = mealForHour(now().getHours());
  const list = rankSuggestions({ meal, energy: 'normal', workDay: isWorkDay() }, state.foods, state.ref);
  const [s] = pageOf(list, suggestPage, 1);
  let inner;
  if (!s) {
    inner = `<p class="muted">ما لقيت اقتراح للحين. سجّلي تجاربك وبتطلع لك اقتراحات من أكلاتك.</p>`;
  } else if (s.type === 'personal') {
    inner = `<p class="big" style="font-size:20px">${esc(s.food.name)} ${s.food.favorite ? '⭐' : ''}</p>
      <div class="food-meta">${pctBadge(s.res.info)}${s.res.source === 'category' ? `<span class="muted small">من فئة ${esc(s.res.catFood.name)} في أكلاتك</span>` : '<span class="badge-src badge-mine">مجربة عندك</span>'}</div>`;
  } else {
    inner = `<p class="big" style="font-size:20px">${esc(s.refItem.name)}</p>
      <div class="food-meta">${ratingBadge(s.refItem)}<span class="badge-src">معلومة عامة، مو مجربة عندك</span></div>`;
  }
  return `<section class="card">
    <h2 class="card-title">${icon('suggest')}اقتراح لل${esc(labelOf(MEALS, meal))}</h2>
    ${inner}
    <div class="btn-row" style="margin-top:12px">
      ${list.length > 1 ? '<button class="btn btn-secondary btn-sm" data-act="suggest-next">غيّر</button>' : ''}
      <button class="btn btn-outline btn-sm" data-act="go" data-to="suggest">اقتراحات أكثر</button>
    </div>
  </section>`;
}

function profileHTML() {
  const p = profileProgress();
  if (!p.remaining) return '';
  const next = nextUnanswered();
  return `<section class="card">
    <h2 class="card-title">${icon('sparkle')}كملي ملفك</h2>
    <p class="muted small">باقي ${p.remaining === 1 ? 'سؤال واحد' : p.remaining === 2 ? 'سؤالين' : `${p.remaining} ${p.remaining <= 10 ? 'أسئلة' : 'سؤال'}`} · كل سؤال لحاله، بأي وقت</p>
    <div class="progress" style="margin:8px 0 12px" aria-hidden="true"><div style="width:${(p.done / p.total) * 100}%"></div></div>
    <button class="btn btn-secondary btn-block" data-act="profile-q" data-key="${esc(next.key)}" style="justify-content:space-between">${esc(next.title)} ${icon('chevron')}</button>
  </section>`;
}

function summaryHTML() {
  const today = dayKey();
  const keys = Array.from({ length: 7 }, (_, i) => addDays(today, -i));
  const ds = keys.map((k) => state.days[k]).filter(Boolean);
  const waterDays = ds.filter((d) => d.water != null);
  const avg = waterDays.length ? (waterDays.reduce((a, d) => a + d.water, 0) / waterDays.length).toFixed(1).replace('.0', '') : null;
  const urgRec = ds.filter((d) => d.urgency);
  const burnRec = ds.filter((d) => d.burning);
  const urg = urgRec.filter((d) => d.urgency !== 'none').length;
  const burn = burnRec.filter((d) => d.burning !== 'none').length;
  const med = ds.filter((d) => d.med === true).length;
  const from = new Date(`${keys[6]}T00:00:00`);
  const tried = state.trials.filter((t) => new Date(t.startedAt) >= from).length;
  const rec = (n) => `<span class="muted small">من ${n} ${n === 1 ? 'يوم' : 'أيام'} مسجلة</span>`;
  return `<details class="card">
    <summary class="summary-toggle">ملخص آخر 7 أيام ${icon('chevron')}</summary>
    <div class="stat-grid">
      <div class="stat">متوسط الماء<b>${avg == null ? 'ما سجلت' : `${avg} أكواب`}</b>${waterDays.length ? rec(waterDays.length) : ''}</div>
      <div class="stat">أيام فيها إلحاح<b>${urgRec.length ? urg : 'ما سجلت'}</b>${urgRec.length ? rec(urgRec.length) : ''}</div>
      <div class="stat">أيام فيها حرقان<b>${burnRec.length ? burn : 'ما سجلت'}</b>${burnRec.length ? rec(burnRec.length) : ''}</div>
      <div class="stat">أيام أخذتي الدواء<b>${med} من 7</b></div>
      <div class="stat">أكلات جديدة جربتيها<b>${tried}</b></div>
    </div>
  </details>`;
}

function render(root, app) {
  const today = dayKey();
  const d = getDay(today);
  const tr = treatmentStatus(today);
  const work = isWorkDay(today);
  const flags = d.redFlags || {};
  const open = root.querySelector('details')?.open;

  root.innerHTML = `
    ${alertsHTML(app)}
    ${trialsHTML()}
    ${treatmentHTML(tr)}
    <section class="card">
      <div class="switch-row">
        <span><b>اليوم دوام؟</b>${d.workOverride != null && d.workOverride !== scheduledWorkDay(today) ? ' <span class="muted small">(لهذا اليوم بس)</span>' : ''}</span>
        <button class="switch" role="switch" aria-checked="${work}" aria-label="اليوم دوام" data-act="work"></button>
      </div>
    </section>
    ${waterHTML(d)}
    ${!tr.set || !tr.ended ? `<section class="card">
      <button class="check-row" data-act="med" aria-pressed="${d.med === true}">
        <span class="box">${d.med ? icon('check') : ''}</span><span>أخذت الدواء اليوم</span>
      </button>
    </section>` : ''}
    <section class="card">
      <h2 class="card-title">الأعراض اليوم</h2>
      <p class="sym-label">الإلحاح</p>${seg('urgency', d.urgency)}
      <p class="sym-label">الحرقان</p>${seg('burning', d.burning)}
      <p class="sym-label">إمساك؟</p>
      <div class="seg" role="group">
        <button type="button" class="chip" data-act="constip" data-val="1" aria-pressed="${d.constipation === true}">نعم</button>
        <button type="button" class="chip" data-act="constip" data-val="0" aria-pressed="${d.constipation === false}">لا</button>
      </div>
    </section>
    <section class="card">
      <h2 class="card-title">${icon('doctor')}أعراض تحتاج طبيب</h2>
      <div class="stack">${RED_FLAGS.map((f) => `
        <button class="check-row danger" data-act="flag" data-id="${f.id}" aria-pressed="${!!flags[f.id]}">
          <span class="box">${flags[f.id] ? icon('check') : ''}</span><span>${f.label}</span>
        </button>`).join('')}</div>
    </section>
    ${suggestionHTML()}
    ${profileHTML()}
    ${summaryHTML()}
  `;
  if (open) root.querySelector('details').open = true;
}

export default {
  title: 'اليوم',
  mount(root, _params, app) {
    render(root, app);
    const today = () => dayKey();
    const off = delegate(root, {
      update: () => app.applyUpdate(),
      dismiss: (el) => dismissAlert(el.dataset.key),
      doctor: () => app.go('doctor'),
      export: () => exportBackup(),
      rate: (el) => rateFlow(el.dataset.id, Number(el.dataset.score)),
      'edit-treatment': () => editTreatmentSheet(),
      'new-treatment': () => editTreatmentSheet({ fresh: true }),
      work: () => updateDay(today(), { workOverride: !isWorkDay(today()) }),
      'water-add': async () => {
        const n = (getDay(today()).water || 0) + 1;
        await updateDay(today(), { water: n });
        snackbar(`زاد كوب · صار ${cupsWord(n)}`, { onAction: () => updateDay(today(), { water: Math.max(0, (getDay(today()).water || 0) - 1) }) });
      },
      'water-minus': () => updateDay(today(), { water: Math.max(0, (getDay(today()).water || 0) - 1) }),
      med: () => updateDay(today(), { med: !getDay(today()).med }),
      level: (el) => {
        const cur = getDay(today())[el.dataset.name];
        updateDay(today(), { [el.dataset.name]: cur === el.dataset.val ? null : el.dataset.val });
      },
      constip: (el) => {
        const v = el.dataset.val === '1';
        const cur = getDay(today()).constipation;
        updateDay(today(), { constipation: cur === v ? null : v });
      },
      flag: (el) => updateDay(today(), { redFlags: { [el.dataset.id]: !getDay(today()).redFlags?.[el.dataset.id] } }),
      'suggest-next': () => { suggestPage++; render(root, app); },
      go: (el) => app.go(el.dataset.to),
      'profile-q': () => { const q = nextUnanswered(); if (q) profileQuestionSheet(q, { chain: true }); },
    });
    return { update: () => render(root, app), destroy: off };
  },
};
