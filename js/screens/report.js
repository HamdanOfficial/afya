// "تقريري": water chart, symptom strip, medicine days, work vs. day-off, foods that helped or bothered.
import { state } from '../store.js';
import { esc, delegate, pctBadge } from '../ui.js';
import { dayKey, addDays, parseDay } from '../dates.js';
import { water, isWorkDay } from '../profile.js';
import { LEVELS, levelLabel } from '../alerts.js';
import { foodPct } from '../scoring.js';

let range = 7;
const LEVEL_N = { none: 0, mild: 1, moderate: 2, severe: 3 };
const LEVEL_CLASS = { none: 'lv-none', mild: 'lv-mild', moderate: 'lv-mod', severe: 'lv-sev' };

const days = (n) => Array.from({ length: n }, (_, i) => addDays(dayKey(), -(n - 1 - i)));
const shortDay = (k) => `${parseDay(k).getDate()}`;

// Rings for the top of "اليوم" (exported so today.js can reuse them).
export function ring(pct, label, value, cls = '') {
  const r = 26;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, pct));
  return `<div class="ring ${cls}">
    <svg viewBox="0 0 64 64" aria-hidden="true"><circle class="ring-track" cx="32" cy="32" r="${r}"/>
      <circle class="ring-fill" cx="32" cy="32" r="${r}" stroke-dasharray="${(c * p).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 32 32)"/></svg>
    <b>${esc(value)}</b><span>${esc(label)}</span></div>`;
}

function waterChart(keys) {
  const w = water();
  const vals = keys.map((k) => state.days[k]?.water);
  const max = Math.max(w.goalCups, ...vals.filter((v) => v != null), 1);
  const W = 320;
  const H = 140;
  const bw = W / keys.length;
  const y = (v) => H - 18 - (v / max) * (H - 30);
  const goalY = y(w.goalCups);
  const bars = keys.map((k, i) => {
    const v = vals[i];
    const x = i * bw + bw * 0.18;
    const width = bw * 0.64;
    if (v == null) return `<rect class="bar-missing" x="${x}" y="${H - 22}" width="${width}" height="4" rx="2"/>`;
    const top = y(v);
    return `<rect class="${v >= w.goalCups ? 'bar-goal' : 'bar'}" x="${x}" y="${top}" width="${width}" height="${Math.max(2, H - 18 - top)}" rx="3"><title>${esc(`${k}: ${v} أكواب`)}</title></rect>`;
  }).join('');
  const labels = keys.length <= 10
    ? keys.map((k, i) => `<text class="ax" x="${i * bw + bw / 2}" y="${H - 4}" text-anchor="middle">${shortDay(k)}</text>`).join('')
    : '';
  const recorded = vals.filter((v) => v != null);
  const avg = recorded.length ? (recorded.reduce((a, b) => a + b, 0) / recorded.length).toFixed(1).replace('.0', '') : null;
  const hit = recorded.filter((v) => v >= w.goalCups).length;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(avg ? `متوسط الماء ${avg} أكواب، وصلتي الهدف ${hit} أيام` : 'ما فيه تسجيل ماء')}" style="direction:ltr">
      <line class="goal-line" x1="0" x2="${W}" y1="${goalY}" y2="${goalY}"/>
      ${bars}${labels}
    </svg>
    <p class="small muted">${avg ? `المتوسط ${avg} أكواب باليوم · وصلتي الهدف (${w.goalCups}) في ${hit} من ${recorded.length} أيام مسجلة` : 'ما سجلتي ماء في هذي الفترة'}</p>`;
}

function symptomStrip(keys) {
  const rows = [
    { id: 'urgency', label: 'الإلحاح' },
    { id: 'burning', label: 'الحرقان' },
  ];
  const cells = (row) => keys.map((k) => {
    const v = state.days[k]?.[row.id];
    return `<i class="cell ${v ? LEVEL_CLASS[v] : 'lv-missing'}" title="${esc(`${k}: ${v ? levelLabel(v) : 'ما سجلت'}`)}"></i>`;
  }).join('');
  const constip = keys.map((k) => {
    const v = state.days[k]?.constipation;
    return `<i class="cell ${v == null ? 'lv-missing' : v ? 'lv-sev' : 'lv-none'}" title="${esc(`${k}: ${v == null ? 'ما سجلت' : v ? 'نعم' : 'لا'}`)}"></i>`;
  }).join('');
  return `<div class="strip" style="--n:${keys.length}">
      ${rows.map((r) => `<span class="strip-label">${r.label}</span><div class="strip-row" style="direction:ltr">${cells(r)}</div>`).join('')}
      <span class="strip-label">إمساك</span><div class="strip-row" style="direction:ltr">${constip}</div>
    </div>
    <div class="legend small">
      ${LEVELS.map((l) => `<span><i class="cell ${LEVEL_CLASS[l.id]}"></i>${l.label}</span>`).join('')}
      <span><i class="cell lv-missing"></i>ما سجلت</span>
    </div>
    <p class="small muted">الأقدم يسار والأحدث يمين.</p>`;
}

function avgLevel(keys, field) {
  const vals = keys.map((k) => state.days[k]?.[field]).filter(Boolean).map((v) => LEVEL_N[v]);
  return vals.length ? { avg: vals.reduce((a, b) => a + b, 0) / vals.length, n: vals.length } : null;
}
const levelWord = (x) => (x < 0.5 ? 'ما فيه غالباً' : x < 1.5 ? 'خفيف' : x < 2.5 ? 'متوسط' : 'قوي');

function workCompare(keys) {
  const work = keys.filter((k) => isWorkDay(k));
  const off = keys.filter((k) => !isWorkDay(k));
  const lines = [];
  for (const f of [{ id: 'urgency', label: 'الإلحاح' }, { id: 'burning', label: 'الحرقان' }]) {
    const a = avgLevel(work, f.id);
    const b = avgLevel(off, f.id);
    if (a && b && a.n >= 2 && b.n >= 2) {
      lines.push(`<li>${f.label}: أيام الدوام <b>${levelWord(a.avg)}</b> · أيام الإجازة <b>${levelWord(b.avg)}</b></li>`);
    }
  }
  return lines.length
    ? `<ul class="plain-list">${lines.join('')}</ul>`
    : '<p class="small muted">يحتاج تسجيل يومين على الأقل في الدوام ويومين في الإجازة عشان أقارن.</p>';
}

function render(root) {
  const keys = days(range);
  const ds = keys.map((k) => state.days[k]).filter(Boolean);
  const med = ds.filter((d) => d.med === true).length;
  const from = new Date(`${keys[0]}T00:00:00`);
  const tried = state.trials.filter((t) => new Date(t.startedAt) >= from).length;
  const tested = state.foods.filter((f) => f.trials?.length);
  const helped = tested.filter((f) => foodPct(f).pct >= 80).sort((a, b) => foodPct(b).pct - foodPct(a).pct).slice(0, 6);
  const bothered = tested.filter((f) => foodPct(f).pct < 50).sort((a, b) => foodPct(a).pct - foodPct(b).pct).slice(0, 6);

  root.innerHTML = `
    <div class="seg" role="group" style="margin-bottom:12px">
      <button class="chip" data-act="range" data-n="7" aria-pressed="${range === 7}">آخر 7 أيام</button>
      <button class="chip" data-act="range" data-n="30" aria-pressed="${range === 30}">آخر 30 يوم</button>
    </div>
    <section class="card"><h2 class="card-title">الماء</h2>${waterChart(keys)}</section>
    <section class="card"><h2 class="card-title">الأعراض</h2>${symptomStrip(keys)}</section>
    <section class="card">
      <h2 class="card-title">الدواء والتجارب</h2>
      <div class="stat-grid">
        <div class="stat">أيام أخذتي الدواء<b>${med} من ${range}</b></div>
        <div class="stat">أكلات جربتيها<b>${tried}</b></div>
      </div>
    </section>
    <section class="card"><h2 class="card-title">الدوام والإجازة</h2>${workCompare(keys)}</section>
    <section class="card">
      <h2 class="card-title">أكلات نفعتك</h2>
      ${helped.length ? helped.map((f) => `<div class="trial-row"><span>${esc(f.name)}</span>${pctBadge(foodPct(f))}</div>`).join('') : '<p class="small muted">لما تقيّمين تجاربك، بتطلع هنا الأكلات اللي ما تعبتك.</p>'}
      <h2 class="card-title" style="margin-top:14px">أكلات تعبتك</h2>
      ${bothered.length ? bothered.map((f) => `<div class="trial-row"><span>${esc(f.name)}</span>${pctBadge(foodPct(f))}</div>`).join('') : '<p class="small muted">ما فيه للحين.</p>'}
    </section>
    <p class="note">هذا ملخص من تسجيلاتك بس، مو تشخيص. تقدرين توريه للطبيب.</p>`;
}

export default {
  title: 'تقريري',
  back: 'today',
  mount(root) {
    render(root);
    const off = delegate(root, { range: (el) => { range = Number(el.dataset.n); render(root); } });
    return { update: () => render(root), destroy: off };
  },
};
