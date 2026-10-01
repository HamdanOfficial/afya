// Onboarding/profile data helpers: treatment day count, work days, profile questions.
import { getSetting, getDay } from './store.js';
import { dayKey, diffDays, addDays, parseDay, WEEKDAYS } from './dates.js';

export const MEDICINE = 'Spasmex (Trospium chloride) 30mg مرة يومياً';
export const MEDICINE_SHORT = 'Spasmex (Trospium) 30mg مرة يومياً';
export const DEFAULT_DURATION = 30;
export const CUP_SIZES = [200, 250, 300, 330, 500];
export const DEFAULT_WATER = { cupMl: 250, goalCups: 8 };
export const DEFAULT_WORK = { days: [0, 1, 2, 3, 4], from: '08:00', to: '16:00' };

// treatment setting: { date, approx, bucket, durationDays }
export function treatmentStatus(today = dayKey()) {
  const t = getSetting('treatment');
  if (!t?.date) return { set: false };
  const total = t.durationDays || DEFAULT_DURATION;
  const dayN = diffDays(t.date, today) + 1;
  const lastDay = addDays(t.date, total - 1);
  const ended = dayN > total;
  return {
    set: true,
    start: t.date,
    approx: !!t.approx,
    total,
    dayN: Math.max(dayN, 1),
    remaining: Math.max(total - dayN, 0),
    ended,
    endedDaysAgo: ended ? diffDays(lastDay, today) : 0,
  };
}

export function antibioticStatus(today = dayKey()) {
  const a = getSetting('antibiotic');
  if (!a?.date) return { set: false };
  return { set: true, date: a.date, approx: !!a.approx, daysAgo: diffDays(a.date, today) };
}

export function water() {
  return { ...DEFAULT_WATER, ...(getSetting('water') || {}) };
}

export function work() {
  return { ...DEFAULT_WORK, ...(getSetting('work') || {}) };
}

// ---------- weekly schedule (her hours change every week) ----------
// settings.schedules = { [weekStart "YYYY-MM-DD" (Sunday)]: { days: [ {off:true} | {from,to} ] x7 } }
export function weekStart(date = dayKey()) {
  return addDays(date, -parseDay(date).getDay());
}

export function weekSchedule(ws) {
  return (getSetting('schedules') || {})[ws] || null;
}

// The usual pattern from onboarding, used for weeks she hasn't filled in.
export function templateWeek() {
  const w = getSetting('work');
  if (!w) return null;
  return { days: Array.from({ length: 7 }, (_, i) => ((w.days || []).includes(i) ? { from: w.from, to: w.to } : { off: true })) };
}

// { work, from, to, source: 'week' | 'template' | 'none' }
export function daySchedule(date = dayKey()) {
  const i = parseDay(date).getDay();
  const wk = weekSchedule(weekStart(date));
  if (wk) { const d = wk.days[i] || { off: true }; return { work: !d.off, from: d.from, to: d.to, source: 'week' }; }
  const t = templateWeek();
  if (t) { const d = t.days[i]; return { work: !d.off, from: d.from, to: d.to, source: 'template' }; }
  return { work: false, source: 'none' };
}

export function scheduledWorkDay(date = dayKey()) {
  return daySchedule(date).work;
}

// Show the "fill next week" reminder from Thursday on, if next week is still empty.
export function nextWeekMissing(today = dayKey()) {
  if (parseDay(today).getDay() < 4) return false;
  return !weekSchedule(addDays(weekStart(today), 7));
}

export function fmtHours(from, to) {
  return from && to ? `${from} – ${to}` : '';
}

export function isWorkDay(date = dayKey()) {
  const d = getDay(date);
  return d.workOverride != null ? d.workOverride : scheduledWorkDay(date);
}

export const workDaysText = (days) => days.map((i) => WEEKDAYS[i]).join('، ');

// ---------- "كملي ملفك" ----------
export const ENERGY_TIMES = [
  { id: 'morning', label: 'صباح' },
  { id: 'noon', label: 'ظهر' },
  { id: 'afternoon', label: 'عصر' },
  { id: 'night', label: 'ليل' },
];
export const WORK_TYPES = [
  { id: 'office', label: 'مكتبي' },
  { id: 'field', label: 'ميداني' },
  { id: 'study', label: 'دراسة' },
  { id: 'other', label: 'غيره' },
];
export const COOKS = [
  { id: 'me', label: 'أنا' },
  { id: 'home', label: 'أكل البيت' },
  { id: 'out', label: 'من برا' },
];
export const PREP_TIMES = [
  { id: 'lt10', label: 'أقل من 10 دقائق' },
  { id: '10to30', label: '10-30 دقيقة' },
  { id: 'gt30', label: 'أكثر من 30 دقيقة' },
];
export const CONSTIPATION = [
  { id: 'never', label: 'أبداً' },
  { id: 'sometimes', label: 'أحياناً' },
  { id: 'often', label: 'كثير' },
];

export const PROFILE_QUESTIONS = [
  { key: 'diagnosis', type: 'text', title: 'وش قال لك الطبيب عن التشخيص؟' },
  { key: 'otherConditions', type: 'text', title: 'عندك حالة صحية ثانية أو حساسية أكل؟' },
  { key: 'workType', type: 'single', title: 'نوع الدوام', options: WORK_TYPES },
  { key: 'energy', type: 'energy', title: 'متى طاقتك عالية؟ ومتى تكونين تعبانة؟' },
  { key: 'cook', type: 'multi', title: 'مين يطبخ لك عادة؟', options: COOKS },
  { key: 'prepTime', type: 'single', title: 'كم وقت تقدرين تعطين للتحضير عادة؟', options: PREP_TIMES },
  { key: 'favFoods', type: 'foods', foodKind: 'fav', title: 'أكلاتك ومشروباتك المفضلة' },
  { key: 'badFoods', type: 'foods', foodKind: 'bad', title: 'أكلات تتعبك' },
  { key: 'goodFoods', type: 'foods', foodKind: 'good', title: 'أكلات جربتيها وما تعبتك' },
  { key: 'constipation', type: 'single', title: 'هل يجيك إمساك؟', options: CONSTIPATION },
];

export function profile() {
  return getSetting('profile') || {};
}

export function isAnswered(q, p = profile()) {
  return (p.answered || []).includes(q.key);
}

export function profileProgress() {
  const p = profile();
  const done = PROFILE_QUESTIONS.filter((q) => isAnswered(q, p)).length;
  return { done, total: PROFILE_QUESTIONS.length, remaining: PROFILE_QUESTIONS.length - done };
}

export const optLabel = (list, id) => list.find((o) => o.id === id)?.label || '';
export const optLabels = (list, ids) => (ids || []).map((id) => optLabel(list, id)).filter(Boolean).join('، ');
