// Weekly work schedule: each week can have different hours, copied from last week and tweaked.
import { getSetting, setSetting } from '../store.js';
import { esc, delegate, toast } from '../ui.js';
import { icon } from '../icons.js';
import { dayKey, addDays, fmtDate, WEEKDAYS, diffDays } from '../dates.js';
import { weekStart, weekSchedule, templateWeek, DEFAULT_WORK } from '../profile.js';

const blankDay = () => ({ from: DEFAULT_WORK.from, to: DEFAULT_WORK.to });

function weekLabel(ws) {
  const thisWs = weekStart(dayKey());
  const n = diffDays(thisWs, ws) / 7;
  const range = `${fmtDate(ws, { year: false })} – ${fmtDate(addDays(ws, 6), { year: false })}`;
  if (n === 0) return `هذا الأسبوع · ${range}`;
  if (n === 1) return `الأسبوع الجاي · ${range}`;
  if (n === -1) return `الأسبوع اللي فات · ${range}`;
  return range;
}

export default {
  title: 'جدول الدوام',
  back: 'settings',
  mount(root, params) {
    let ws = params[0] || weekStart(dayKey());
    let draft;
    let dirty = false;

    const load = () => {
      const saved = weekSchedule(ws);
      draft = saved ? structuredClone(saved) : structuredClone(templateWeek() || { days: Array.from({ length: 7 }, () => ({ off: true })) });
      dirty = false;
    };

    const render = () => {
      const saved = !!weekSchedule(ws);
      root.innerHTML = `
        <div class="row-between" style="margin-bottom:10px">
          <button class="icon-btn" data-act="week" data-step="-1" aria-label="الأسبوع اللي قبل">${icon('back')}</button>
          <h1 class="big" style="font-size:18px;text-align:center;flex:1">${esc(weekLabel(ws))}</h1>
          <button class="icon-btn" data-act="week" data-step="1" aria-label="الأسبوع اللي بعد">${icon('chevron')}</button>
        </div>
        ${saved ? '' : `<p class="note" style="margin-bottom:10px">${templateWeek() ? 'هذا الأسبوع ما انحفظ له جدول، فالمعروض هو جدولك المعتاد.' : 'ما فيه جدول لهذا الأسبوع.'}</p>`}
        <div class="btn-row" style="margin-bottom:12px">
          <button class="btn btn-secondary btn-sm" data-act="copy-prev">${icon('copyDay')} انسخي الأسبوع اللي فات</button>
          <button class="btn btn-ghost btn-sm" data-act="all-off">كله إجازة</button>
        </div>
        ${draft.days.map((d, i) => {
          const date = addDays(ws, i);
          return `<section class="card sched-day ${d.off ? 'is-off' : ''}">
            <div class="row-between">
              <div><b>${WEEKDAYS[i]}</b> <span class="muted small">${esc(fmtDate(date, { year: false }))}</span></div>
              <div class="seg seg-2" role="group">
                <button class="chip" data-act="set-work" data-i="${i}" aria-pressed="${!d.off}">دوام</button>
                <button class="chip" data-act="set-off" data-i="${i}" aria-pressed="${!!d.off}">إجازة</button>
              </div>
            </div>
            ${d.off ? '' : `<div class="time-row" style="margin-top:10px">
              <label class="field" style="margin:0"><span class="small">من</span><input class="input" type="time" data-i="${i}" data-k="from" value="${esc(d.from || '')}"></label>
              <label class="field" style="margin:0"><span class="small">إلى</span><input class="input" type="time" data-i="${i}" data-k="to" value="${esc(d.to || '')}"></label>
            </div>`}
          </section>`;
        }).join('')}
        <button class="btn btn-primary btn-block" data-act="save" style="margin-top:6px">حفظ جدول هذا الأسبوع</button>
        <p class="note" style="margin-top:12px">مفتاح "اليوم دوام؟" في شاشة اليوم ياخذ قيمته من هذا الجدول، وتقدرين تغيرينه ليوم واحد بس.</p>`;
    };

    const save = async () => {
      const all = { ...(getSetting('schedules') || {}) };
      all[ws] = draft;
      // keep the last ~6 months only
      for (const k of Object.keys(all)) if (diffDays(k, ws) > 182) delete all[k];
      await setSetting('schedules', all);
      dirty = false;
      toast('انحفظ الجدول ✔️');
    };

    load();
    render();

    const onInput = (e) => {
      const el = e.target;
      if (el.dataset.k) { draft.days[Number(el.dataset.i)][el.dataset.k] = el.value; dirty = true; }
    };
    root.addEventListener('change', onInput);

    const off = delegate(root, {
      week: (el) => {
        if (dirty) save();
        ws = addDays(ws, Number(el.dataset.step) * 7);
        history.replaceState({ inApp: true }, '', `#/schedule/${ws}`);
        load();
        render();
      },
      'set-work': (el) => { const d = draft.days[Number(el.dataset.i)]; if (d.off) { Object.assign(d, blankDay(), { off: false }); delete d.off; dirty = true; render(); } },
      'set-off': (el) => { draft.days[Number(el.dataset.i)] = { off: true }; dirty = true; render(); },
      'all-off': () => { draft.days = draft.days.map(() => ({ off: true })); dirty = true; render(); },
      'copy-prev': () => {
        const prev = weekSchedule(addDays(ws, -7)) || templateWeek();
        if (!prev) { toast('ما فيه أسبوع قبله أنسخ منه'); return; }
        draft = structuredClone(prev);
        dirty = true;
        render();
        toast('انسخ ✔️ عدّلي اللي تغيّر واضغطي حفظ');
      },
      save: async () => { await save(); render(); },
    });
    return {
      update: () => {},
      destroy: () => { if (dirty) save(); off(); root.removeEventListener('change', onInput); },
    };
  },
};
