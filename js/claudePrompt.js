// Builds the text copied by "اسألي Claude" from the current data.
import { state, getSetting } from './store.js';
import { dayKey, addDays, diffDays, fmtDate, fmtTime, now, WEEKDAYS } from './dates.js';
import { foodPct, comparePct } from './scoring.js';
import { activeTrials } from './actions.js';
import { levelLabel, RED_FLAGS } from './alerts.js';
import {
  treatmentStatus, antibioticStatus, water, isWorkDay, workDaysText, profile, MEDICINE_SHORT,
  WORK_TYPES, ENERGY_TIMES, COOKS, PREP_TIMES, CONSTIPATION, optLabel, optLabels,
  weekStart, weekSchedule, fmtHours,
} from './profile.js';

const NA = 'ما انذكر';
const NR = 'ما سجلت';
const or = (v) => (v == null || v === '' ? NA : v);

export const RULES = `أنت مساعدي في الأكل والشرب لحالة المثانة. قواعد الرد:
- لهجة سعودية بيضاء، ردود قصيرة.
- صريح أولاً، طمّني فقط إذا فيه سبب حقيقي، ولا تقول معلومة غير مؤكدة.
- لا تقول إن أكلة "آمنة 100%". تجربتي الشخصية تتقدم على أي قائمة عامة.
- رد على أسئلة الأكل بـ: تصنيف (🟢/🟡/🔴) + ثقة (عالية/متوسطة/منخفضة) + سبب بسطر + بديل.
- لا تقترح تغيير أو إيقاف الدواء.
- إذا ذكرت حرارة، ألم ظهر أو جنب، دم في البول، رجوع الحرقان، أو أعراض مستمرة: قل لي أراجع الطبيب بوضوح.
- "ما سجلت" تعني ما فيه بيانات، مو إن ما فيه أعراض.
- إذا اتفقنا على نسبة لأكلة، ذكرني أسجلها في تطبيق "عافية".`;

const approx = (s, isApprox) => (isApprox ? `${s} تقريباً` : s);

function timeSection(today) {
  const d = now();
  const lines = [`التاريخ: ${fmtDate(today, { weekday: true })} | الساعة: ${fmtTime(d)}`];
  lines.push(`اليوم: ${isWorkDay(today) ? 'دوام' : 'إجازة'}`);

  const t = treatmentStatus(today);
  if (!t.set) lines.push(`دواء المثانة العصبية: ${NA}`);
  else if (t.ended) lines.push(`دواء المثانة العصبية: خلصت مدة العلاج قبل ${t.endedDaysAgo} يوم (بدأ ${approx(fmtDate(t.start), t.approx)})`);
  else lines.push(`دواء المثانة العصبية: اليوم ${approx(`${t.dayN} من ${t.total}`, t.approx)} (بدأ ${approx(fmtDate(t.start), t.approx)}) | متبقي ${t.remaining} يوم`);

  const a = antibioticStatus(today);
  if (!a.set) lines.push(`آخر مضاد حيوي: ${NA}`);
  else lines.push(`آخر مضاد حيوي: خلص قبل ${approx(`${a.daysAgo} يوم`, a.approx)} (${approx(fmtDate(a.date), a.approx)})`);
  return lines;
}

function myDataSection(today) {
  const p = profile();
  const w = getSetting('work');
  const workParts = [];
  const wk = weekSchedule(weekStart(today));
  if (wk) {
    workParts.push(`هذا الأسبوع (يتغير كل أسبوع): ${wk.days.map((d, i) => `${WEEKDAYS[i]} ${d.off ? 'إجازة' : fmtHours(d.from, d.to)}`).join('، ')}`);
  } else {
    if (w?.days?.length) workParts.push(workDaysText(w.days));
    if (w?.from && w?.to) workParts.push(`من ${w.from} إلى ${w.to}`);
  }
  if (p.workType) workParts.push(optLabel(WORK_TYPES, p.workType));
  const energyParts = [];
  if (p.energyHigh?.length) energyParts.push(`عالية: ${optLabels(ENERGY_TIMES, p.energyHigh)}`);
  if (p.energyLow?.length) energyParts.push(`تعبانة: ${optLabels(ENERGY_TIMES, p.energyLow)}`);
  const wat = water();
  const hasWater = !!getSetting('water');
  const todayWater = state.days[today]?.water;

  return [
    `التشخيص: ${or(p.diagnosis)}`,
    `الدواء: ${MEDICINE_SHORT}`,
    `حالات/حساسية أخرى: ${or(p.otherConditions)}`,
    `الدوام: ${workParts.length ? workParts.join(' | ') : NA}`,
    `الطاقة: ${energyParts.length ? energyParts.join(' | ') : NA}`,
    `الأكل: ${or(optLabels(COOKS, p.cook))} | وقت التحضير: ${or(optLabel(PREP_TIMES, p.prepTime))}`,
    `الماء: الهدف ${hasWater ? `${wat.goalCups} أكواب (${wat.goalCups * wat.cupMl} مل)` : NA} | اليوم: ${todayWater == null ? NR : `${todayWater} أكواب`}`,
    `الإمساك: ${or(optLabel(CONSTIPATION, p.constipation))}`,
  ];
}

export function foodLine(f) {
  const info = foodPct(f);
  const parts = [f.name, info.pct == null ? 'ما انجربت' : `${info.pct}%`, `${info.count} تجارب`];
  if (f.kind === 'category') parts.push('فئة');
  if (info.manual) parts.push('يدوي');
  if (f.favorite) parts.push('مفضلة');
  if (f.notes) parts.push(f.notes);
  return parts.join(' - ');
}

function foodsSection() {
  const all = [...state.foods].sort(comparePct);
  if (!all.length) return ['ما فيه'];
  if (all.length <= 40) return all.map(foodLine);
  const top = all.slice(0, 40);
  const low = all.slice(40).filter((f) => {
    const p = foodPct(f).pct;
    return p != null && p < 20;
  });
  const shown = [...top, ...low];
  return [`(العدد الكلي ${all.length}، المعروض ${shown.length}: أعلى 40 نسبة + كل اللي أقل من 20%)`, ...shown.map(foodLine)];
}

function trialsSection() {
  const list = activeTrials();
  if (!list.length) return ['ما فيه'];
  return list.map((t) => `${t.name} - ${fmtDate(dayKey(new Date(t.startedAt)))}`);
}

function hasData(d) {
  return d && (d.water != null || d.urgency || d.burning || d.constipation != null || d.med != null ||
    Object.values(d.redFlags || {}).some(Boolean));
}

function daysSection(today) {
  const lines = [];
  const recorded = Object.values(state.days).filter(hasData).map((d) => d.date).filter((k) => k <= today).sort();
  const last = recorded[recorded.length - 1];
  if (!last) lines.push('ما فيه أي تسجيل للحين');
  else {
    const gap = diffDays(last, today);
    if (gap > 3) lines.push(`آخر تسجيل كان قبل ${gap} يوم`);
  }
  for (let i = 0; i < 7; i++) {
    const key = addDays(today, -i);
    const d = state.days[key];
    const label = fmtDate(key, { year: false, weekday: true });
    if (!hasData(d)) { lines.push(`${label}: ${NR}`); continue; }
    const parts = [
      `ماء ${d.water == null ? NR : d.water}`,
      `إلحاح ${d.urgency ? levelLabel(d.urgency) : NR}`,
      `حرقان ${d.burning ? levelLabel(d.burning) : NR}`,
      `إمساك ${d.constipation == null ? NR : d.constipation ? 'نعم' : 'لا'}`,
      `الدواء ${d.med == null ? NR : d.med ? '✔️' : '❌'}`,
    ];
    const flags = RED_FLAGS.filter((f) => d.redFlags?.[f.id]).map((f) => f.label);
    if (flags.length) parts.push(`أعراض طبيب: ${flags.join('، ')}`);
    lines.push(`${label}: ${parts.join(' | ')}`);
  }
  return lines;
}

export function buildPrompt(question = '') {
  const today = dayKey();
  const sections = [
    RULES,
    ['=== وقت السؤال ===', ...timeSection(today)].join('\n'),
    ['=== بياناتي ===', ...myDataSection(today)].join('\n'),
    ['=== أكلاتي ونسبها ===', ...foodsSection()].join('\n'),
    ['=== تحت التجربة ===', ...trialsSection()].join('\n'),
    ['=== آخر 7 أيام ===', ...daysSection(today)].join('\n'),
  ];
  const q = String(question || '').trim();
  if (q) sections.push(['=== سؤالي ===', q].join('\n'));
  return sections.join('\n\n');
}
