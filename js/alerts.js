// Automatic medical alerts + backup reminder. An alert stays until "فهمت" and returns if the condition repeats.
import { state, getSetting } from './store.js';
import { dayKey, addDays, diffDays, now, DAY_MS } from './dates.js';

export const LEVELS = [
  { id: 'none', label: 'ما فيه' },
  { id: 'mild', label: 'خفيف' },
  { id: 'moderate', label: 'متوسط' },
  { id: 'severe', label: 'قوي' },
];
export const levelLabel = (id) => LEVELS.find((l) => l.id === id)?.label || '';

export const RED_FLAGS = [
  { id: 'fever', label: 'حرارة' },
  { id: 'back', label: 'ألم في الظهر أو الجنب' },
  { id: 'blood', label: 'دم في البول' },
];

const day = (key) => state.days[key] || {};

// Latest day d in [today, yesterday] where `test` holds for n consecutive days ending at d.
function streakEnd(today, n, test) {
  for (const end of [today, addDays(today, -1)]) {
    let ok = true;
    for (let i = 0; i < n; i++) if (!test(day(addDays(end, -i)))) { ok = false; break; }
    if (ok) return end;
  }
  return null;
}

export function medicalAlerts(today = dayKey()) {
  const out = [];
  const flags = RED_FLAGS.filter((f) => day(today).redFlags?.[f.id]);
  if (flags.length) {
    out.push({
      key: `redflag:${today}:${flags.map((f) => f.id).join(',')}`,
      kind: 'medical',
      title: 'راجعي الطبيب',
      text: `علّمتي اليوم: ${flags.map((f) => f.label).join('، ')}. هذي أعراض تحتاج تراجعين فيها الطبيب.`,
    });
  }
  const burn = streakEnd(today, 2, (d) => d.burning === 'moderate' || d.burning === 'severe');
  if (burn) {
    out.push({
      key: `burning2:${burn}`,
      kind: 'medical',
      title: 'الحرقان مستمر',
      text: 'الحرقان صار متوسط أو أقوى يومين ورا بعض. راجعي الطبيب.',
    });
  }
  const urg = streakEnd(today, 2, (d) => d.urgency === 'severe');
  if (urg) {
    out.push({
      key: `urgency2:${urg}`,
      kind: 'medical',
      title: 'الإلحاح قوي',
      text: 'الإلحاح كان قوي يومين ورا بعض. راجعي الطبيب.',
    });
  }
  const con = streakEnd(today, 3, (d) => d.constipation === true);
  if (con) {
    out.push({
      key: `constip3:${con}`,
      kind: 'medical',
      title: 'إمساك مستمر',
      text: 'عندك إمساك 3 أيام ورا بعض. راجعي الطبيب.',
    });
  }
  return out;
}

export function backupDue() {
  const last = getSetting('lastExportAt') || getSetting('firstUseAt');
  if (!last) return false;
  return now() - new Date(last) >= 7 * DAY_MS;
}

export function daysSinceExport() {
  const last = getSetting('lastExportAt');
  return last ? diffDays(dayKey(new Date(last)), dayKey()) : null;
}

export function activeAlerts(today = dayKey()) {
  const list = medicalAlerts(today);
  if (backupDue()) {
    const n = daysSinceExport();
    list.push({
      key: `backup:${today}`,
      kind: 'backup',
      title: 'سوّي نسخة احتياطية',
      text: n == null ? 'ما سويتي نسخة احتياطية للحين. تحفظ بياناتك لو ضاع الجوال.' : `آخر نسخة احتياطية كانت قبل ${n} يوم.`,
    });
  }
  return list.filter((a) => !state.alerts[a.key]);
}
