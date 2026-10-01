// Date helpers. Day keys are local dates "YYYY-MM-DD".

export const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
export const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

let clockOffset = 0; // test hook: shift "now"
export function setClockOffset(ms) { clockOffset = ms; }
export function now() { return new Date(Date.now() + clockOffset); }

const pad = (n) => String(n).padStart(2, '0');

export function dayKey(d = now()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = parseDay(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

// Whole calendar days from a to b (b - a).
export function diffDays(aKey, bKey) {
  return Math.round((parseDay(bKey) - parseDay(aKey)) / DAY_MS);
}

export function fmtDate(key, { year = true, weekday = false } = {}) {
  if (!key) return '';
  const d = parseDay(key);
  let s = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  if (year) s += ` ${d.getFullYear()}`;
  if (weekday) s = `${WEEKDAYS[d.getDay()]} ${s}`;
  return s;
}

export function fmtTime(d = now()) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Arabic count phrases: "يوم وحد" / "يومين" / "3 أيام" / "11 يوم"
export function countWord(n, one, two, few, many) {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
}

export const daysWord = (n) => countWord(n, 'يوم', 'يومين', 'أيام', 'يوم');
export const trialsWord = (n) => (n === 0 ? 'ولا تجربة' : countWord(n, 'تجربة وحدة', 'تجربتين', 'تجارب', 'تجربة'));
export const cupsWord = (n) => (n === 1 ? 'كوب' : n === 2 ? 'كوبين' : `${n} ${n >= 3 && n <= 10 ? 'أكواب' : 'كوب'}`);
export const hoursWord = (n) => countWord(n, 'ساعة', 'ساعتين', 'ساعات', 'ساعة');

// Approximate-date buckets (onboarding "ما أتذكر بالضبط")
export const APPROX_BUCKETS = [
  { id: 'lt1w', label: 'قبل أقل من أسبوع', daysAgo: 4 },
  { id: '1to2w', label: 'قبل 1-2 أسبوع', daysAgo: 10 },
  { id: '2to3w', label: 'قبل 2-3 أسابيع', daysAgo: 17 },
  { id: 'gt3w', label: 'قبل أكثر من 3 أسابيع', daysAgo: 25 },
];

export function approxDate(bucketId) {
  const b = APPROX_BUCKETS.find((x) => x.id === bucketId);
  return addDays(dayKey(), -(b ? b.daysAgo : 0));
}

// {date, approx} -> "20 سبتمبر 2026" or "20 سبتمبر 2026 تقريباً"
export function fmtMaybeApprox(v) {
  if (!v || !v.date) return '';
  return fmtDate(v.date) + (v.approx ? ' تقريباً' : '');
}
