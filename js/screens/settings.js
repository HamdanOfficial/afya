import { state, getSetting, setSetting } from '../store.js';
import { esc, delegate, chips, bindChips, openSheet, ask, toast } from '../ui.js';
import { icon } from '../icons.js';
import { fmtDate, fmtMaybeApprox, dayKey, addDays, WEEKDAYS } from '../dates.js';
import {
  MEDICINE, CUP_SIZES, water, work, profile, PROFILE_QUESTIONS, isAnswered, optLabel, optLabels, ENERGY_TIMES,
  weekStart, weekSchedule,
} from '../profile.js';
import { editTreatmentSheet, editAntibioticSheet, profileQuestionSheet } from '../flows.js';
import { exportBackup, parseBackup, importBackup, wipeAll } from '../backup.js';
import { APP_VERSION } from '../version.js';
import { PALETTES, LOGOS, currentPalette, currentLogo, applyPalette, setLogo, logoSVG } from '../brand.js';

const DAY_OPTS = WEEKDAYS.map((label, id) => ({ id: String(id), label }));

function answerText(q, p) {
  if (!isAnswered(q, p)) return 'ما انجاوب';
  if (q.type === 'text') return p[q.key] || '—';
  if (q.type === 'single') return optLabel(q.options, p[q.key]) || '—';
  if (q.type === 'multi') return optLabels(q.options, p[q.key]) || '—';
  if (q.type === 'energy') {
    const parts = [];
    if (p.energyHigh?.length) parts.push(`عالية: ${optLabels(ENERGY_TIMES, p.energyHigh)}`);
    if (p.energyLow?.length) parts.push(`تعبانة: ${optLabels(ENERGY_TIMES, p.energyLow)}`);
    return parts.join(' · ') || '—';
  }
  return 'انحفظت في أكلاتي';
}

function render(root) {
  const t = getSetting('treatment');
  const ab = getSetting('antibiotic');
  const w = work();
  const hasWork = !!getSetting('work');
  const wat = water();
  const p = profile();
  const lastExport = getSetting('lastExportAt');
  const otherCup = !CUP_SIZES.includes(wat.cupMl);
  const pal = currentPalette();
  const logo = currentLogo();
  root.innerHTML = `
    <h2 class="section-label">المظهر</h2>
    <section class="card" data-tour="settings-theme">
      <p class="small muted" style="margin-bottom:8px">اختاري الألوان. النهاري والليلي يتغيرون من زر القمر 🌙 فوق.</p>
      <div class="pal-grid">
        ${PALETTES.map((p) => `<button class="pal" data-act="palette" data-id="${p.id}" aria-pressed="${pal === p.id}">
          <span class="pal-prevs">
            <span class="pal-prev" data-palette="${p.id}" data-theme="light"><i></i><b></b></span>
            <span class="pal-prev" data-palette="${p.id}" data-theme="dark"><i></i><b></b></span>
          </span>
          <span class="pal-name">${esc(p.label)}</span>
        </button>`).join('')}
      </div>
      <p class="sym-label">الشعار</p>
      <div class="logo-grid">
        ${LOGOS.map((l) => `<button class="logo-opt" data-act="logo" data-id="${l.id}" aria-pressed="${logo === l.id}">${logoSVG(l.id, 44)}<span class="small">${esc(l.label)}</span></button>`).join('')}
      </div>
    </section>

    <h2 class="section-label">الشروحات</h2>
    <section class="card">
      <div class="btn-col">
        <button class="btn btn-primary" data-act="tour">${icon('sparkle')} شغّلي الجولة السريعة</button>
        <button class="btn btn-secondary" data-act="help">${icon('help')} شروحات كل قسم</button>
      </div>
    </section>

    <h2 class="section-label">العلاج</h2>
    <section class="card">
      <p class="small muted">الدواء</p><p dir="ltr" style="text-align:right">${esc(MEDICINE)}</p>
      <div class="hr"></div>
      <div class="row-between"><div><p class="small muted">بداية علاج المثانة العصبية</p>
        <p>${t?.date ? `${esc(fmtMaybeApprox(t))} · ${t.durationDays} يوم` : 'ما انحدد'}</p></div>
        <button class="btn btn-ghost btn-sm" data-act="treatment">تعديل</button></div>
      <button class="btn btn-secondary btn-block" data-act="new-treatment" style="margin-top:8px">بديت علاج جديد</button>
      ${state.treatments.length ? `<p class="small muted" style="margin-top:12px">العلاجات السابقة</p>
        ${[...state.treatments].sort((a, b) => b.date.localeCompare(a.date)).map((x) => `<div class="trial-row"><span>${esc(fmtMaybeApprox(x))}</span><span class="muted">${x.durationDays} يوم</span></div>`).join('')}` : ''}
      <div class="hr"></div>
      <div class="row-between"><div><p class="small muted">آخر مضاد حيوي خلص</p><p>${ab?.date ? esc(fmtMaybeApprox(ab)) : 'ما انحدد'}</p></div>
        <button class="btn btn-ghost btn-sm" data-act="antibiotic">تعديل</button></div>
    </section>

    <h2 class="section-label">الدوام</h2>
    <section class="card" data-tour="settings-schedule">
      <p class="small muted" style="margin-bottom:8px">إذا أوقات دوامك تتغير كل أسبوع، عبّي جدول كل أسبوع.</p>
      <div class="btn-col">
        <button class="btn btn-primary" data-act="schedule" data-week="${weekStart()}">${icon('calendar')} جدول هذا الأسبوع ${weekSchedule(weekStart()) ? '✔️' : ''}</button>
        <button class="btn btn-secondary" data-act="schedule" data-week="${addDays(weekStart(), 7)}">${icon('calendar')} جدول الأسبوع الجاي ${weekSchedule(addDays(weekStart(), 7)) ? '✔️' : ''}</button>
      </div>
      <details style="margin-top:12px">
        <summary class="summary-toggle" style="font-size:16px">الجدول المعتاد ${icon('chevron')}</summary>
        <p class="note" style="margin:4px 0 10px">يُستخدم لأي أسبوع ما عبّيتي له جدول.</p>
        <div class="field"><span>أيام الدوام</span>${chips('workDays', DAY_OPTS, hasWork ? w.days.map(String) : [], { multi: true, small: true })}</div>
        <div class="time-row">
          <label class="field"><span>من</span><input class="input" type="time" data-field="from" value="${esc(hasWork ? w.from : '')}"></label>
          <label class="field"><span>إلى</span><input class="input" type="time" data-field="to" value="${esc(hasWork ? w.to : '')}"></label>
        </div>
      </details>
    </section>

    <h2 class="section-label">الماء</h2>
    <section class="card">
      <div class="field"><span>حجم الكوب</span>${chips('cup', [...CUP_SIZES.map((n) => ({ id: String(n), label: `${n} مل` })), { id: 'other', label: 'رقم آخر' }], otherCup ? 'other' : String(wat.cupMl), { small: true })}</div>
      <label class="field" data-other-cup ${otherCup ? '' : 'hidden'}><span>كم مل؟</span><input class="input" type="number" inputmode="numeric" min="50" max="2000" data-field="cupMl" value="${wat.cupMl}"></label>
      <label class="field"><span>الهدف اليومي (أكواب)</span><input class="input" type="number" inputmode="numeric" min="1" max="30" data-field="goalCups" value="${wat.goalCups}"></label>
      <p class="note">اسألي طبيبك عن الكمية المناسبة لك.</p>
    </section>

    <h2 class="section-label">ملفي</h2>
    <section class="card">
      ${PROFILE_QUESTIONS.map((q) => `<button class="btn btn-secondary btn-block" style="justify-content:space-between;text-align:start;margin-bottom:8px;height:auto;padding:10px 14px" data-act="q" data-key="${q.key}">
        <span><b style="display:block">${esc(q.title)}</b><span class="muted small">${esc(answerText(q, p))}</span></span>${icon('chevron')}</button>`).join('')}
    </section>

    <h2 class="section-label">النسخة الاحتياطية</h2>
    <section class="card" data-tour="settings-backup">
      <p class="muted small" style="margin-bottom:10px">${lastExport ? `آخر نسخة: ${esc(fmtDate(dayKey(new Date(lastExport))))}` : 'ما سويتي نسخة احتياطية للحين.'}</p>
      <div class="btn-row">
        <button class="btn btn-primary" data-act="export">${icon('share')} تصدير</button>
        <button class="btn btn-secondary" data-act="import">استيراد</button>
      </div>
      <input type="file" accept="application/json,.json" data-file hidden>
      <p class="note" style="margin-top:10px">التصدير يطلع ملف تحفظينه في "الملفات" أو ترسلينه لنفسك. سوّيه كل أسبوع.</p>
    </section>

    <section class="card">
      <button class="btn btn-secondary btn-block" data-act="doctor">${icon('doctor')} متى أراجع الطبيب؟</button>
    </section>

    <section class="card">
      <button class="btn btn-danger btn-block" data-act="wipe">${icon('trash')} مسح كل البيانات</button>
    </section>
    <p class="muted small" style="text-align:center;margin:16px 0">عافية · الإصدار ${APP_VERSION}</p>
  `;
}

function wipeSheet(app) {
  openSheet({
    title: 'مسح كل البيانات',
    body: `<p class="sheet-text">هذا يمسح كل شي: أكلاتك، تجاربك، تسجيلاتك. ما فيه رجعة. إذا متأكدة اكتبي <b>امسحي</b> تحت.</p>
      <input class="input" name="c" autocomplete="off" placeholder="امسحي">
      <button class="btn btn-danger btn-block" data-go style="margin-top:12px" disabled>امسحي كل شي</button>`,
    onMount(el, close) {
      const input = el.querySelector('[name=c]');
      const btn = el.querySelector('[data-go]');
      input.addEventListener('input', () => { btn.disabled = input.value.trim() !== 'امسحي'; });
      btn.addEventListener('click', async () => {
        await wipeAll();
        close();
        app.restart();
      });
    },
  });
}

export default {
  title: 'الإعدادات',
  back: 'today',
  mount(root, _p, app) {
    const draw = () => {
      render(root);
      bindChips(root, async (k, v) => {
        if (k === 'workDays') await setSetting('work', { ...work(), days: v.map(Number) });
        if (k === 'cup') {
          if (v === 'other') { root.querySelector('[data-other-cup]').hidden = false; root.querySelector('[data-field=cupMl]').focus(); return; }
          if (v) await setSetting('water', { ...water(), cupMl: Number(v) });
        }
      });
    };
    draw();
    const onChange = async (e) => {
      const el = e.target;
      const k = el.dataset?.field;
      if (k === 'from' || k === 'to') await setSetting('work', { ...work(), [k]: el.value });
      if (k === 'cupMl' || k === 'goalCups') {
        const n = parseInt(el.value, 10);
        if (n > 0) await setSetting('water', { ...water(), [k]: n });
      }
      if (el.matches('[data-file]') && el.files[0]) {
        const text = await el.files[0].text();
        el.value = '';
        let backup;
        try { backup = parseBackup(text); } catch (err) { toast(err.message); return; }
        const ok = await ask({
          title: 'استيراد النسخة؟',
          text: `النسخة من ${fmtDate(dayKey(new Date(backup.exportedAt)))}. راح تستبدل كل البيانات اللي في التطبيق الحين.`,
          buttons: [{ label: 'استبدلي البيانات', value: true, danger: true }, { label: 'إلغاء', value: false }],
        });
        if (!ok) return;
        await importBackup(backup);
        toast('تم الاستيراد ✔️');
        app.restart();
      }
    };
    root.addEventListener('change', onChange);
    const off = delegate(root, {
      schedule: (el) => app.go(`schedule/${el.dataset.week}`),
      palette: async (el) => { applyPalette(el.dataset.id, { save: true }); await setSetting('palette', el.dataset.id); },
      logo: async (el) => { setLogo(el.dataset.id); await setSetting('logo', el.dataset.id); app.refreshHeader(); },
      tour: () => app.startTour(),
      help: () => app.go('help'),
      treatment: () => editTreatmentSheet(),
      'new-treatment': () => editTreatmentSheet({ fresh: true }),
      antibiotic: () => editAntibioticSheet(),
      q: (el) => profileQuestionSheet(PROFILE_QUESTIONS.find((q) => q.key === el.dataset.key)),
      export: async () => {
        const r = await exportBackup();
        if (r === 'downloaded') toast('انحفظ الملف ✔️');
        else if (r === 'shared') toast('تم ✔️');
      },
      import: () => root.querySelector('[data-file]').click(),
      doctor: () => app.go('doctor'),
      wipe: () => wipeSheet(app),
    });
    return {
      update: () => {
        const a = document.activeElement;
        if (a && root.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;
        draw();
      },
      destroy: () => { off(); root.removeEventListener('change', onChange); },
    };
  },
};
