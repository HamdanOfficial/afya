// Percent calculation and lookup priority: the item itself -> its category in "أكلاتي" -> the general reference.
import { matchKey, exactAny } from './normalize.js';
import { trialsWord } from './dates.js';

export const RATING = {
  green: { emoji: '🟢', word: 'آمن غالباً', band: 'green' },
  yellow: { emoji: '🟡', word: 'بحذر', band: 'yellow' },
  red: { emoji: '🔴', word: 'تجنبيه حالياً', band: 'red' },
};
export const CONFIDENCE = { high: 'عالية', medium: 'متوسطة', low: 'منخفضة' };
export const SCORE_WORDS = { 100: 'ما تعبتني', 50: 'تعب خفيف', 0: 'تعبتني' };

export function foodPct(food) {
  const count = food?.trials?.length || 0;
  if (food && food.manualPct != null) return { pct: food.manualPct, manual: true, count };
  if (!count) return { pct: null, manual: false, count: 0 };
  const sum = food.trials.reduce((a, t) => a + t.score, 0);
  return { pct: Math.round(sum / count), manual: false, count };
}

export function band(pct) {
  if (pct == null) return 'none';
  if (pct >= 80) return 'green';
  if (pct >= 50) return 'yellow';
  if (pct >= 20) return 'orange';
  return 'red';
}

// "83% · 6 تجارب" / "100% · تجربة وحدة" / "ما انجربت"
export function pctLabel(info) {
  if (!info || info.pct == null) return 'ما انجربت';
  return `${info.pct}% · ${trialsWord(info.count)}`;
}

export const foodNames = (f) => [f.name, ...(f.aliases || [])];
export const refNames = (r) => [r.name, ...(r.aliases || [])];

// Reference item whose name or alias equals this name (after normalization).
export function refFor(name, ref) {
  return ref.items.find((r) => exactAny(name, refNames(r))) || null;
}

export function refById(id, ref) {
  return id ? ref.items.find((r) => r.id === id) || null : null;
}

// Reference category matching a name, e.g. "الحوامض" / "حوامض".
export function refCategory(name, ref) {
  const k = matchKey(name);
  return ref.categories.find((c) => matchKey(c) === k) || null;
}

// Personal entry for a reference item (linked by id or by name).
export function personalForRef(refItem, foods) {
  return (
    foods.find((f) => f.kind !== 'category' && f.refId === refItem.id) ||
    foods.find((f) => f.kind !== 'category' && exactAny(f.name, refNames(refItem))) ||
    null
  );
}

// Personal category entry ("فئة") with this category name.
export function categoryFood(categoryName, foods) {
  if (!categoryName) return null;
  const k = matchKey(categoryName);
  return foods.find((f) => f.kind === 'category' && matchKey(f.name) === k) || null;
}

/**
 * Resolve the best-known answer for a food.
 * Pass a personal food and/or a reference item.
 * Returns { source: 'self'|'category'|'ref'|'none', pct, info, food, catFood, refItem }.
 */
export function resolve({ food = null, refItem = null }, foods, ref) {
  if (!refItem && food?.refId) refItem = refById(food.refId, ref);
  if (!food && refItem) food = personalForRef(refItem, foods);

  if (food) {
    const info = foodPct(food);
    if (info.pct != null) return { source: 'self', pct: info.pct, info, food, catFood: null, refItem };
  }
  // A personal category entry is resolved on its own above; items fall back to their category.
  if (food?.kind !== 'category') {
    const cat = food?.category || refItem?.category;
    const catFood = categoryFood(cat, foods);
    if (catFood) {
      const info = foodPct(catFood);
      if (info.pct != null) return { source: 'category', pct: info.pct, info, food, catFood, refItem };
    }
  }
  if (refItem) return { source: 'ref', pct: null, info: null, food, catFood: null, refItem };
  return { source: 'none', pct: null, info: food ? foodPct(food) : null, food, catFood: null, refItem: null };
}

// Sorting helper: tested items by pct desc, untested last.
export function comparePct(a, b) {
  const pa = foodPct(a).pct;
  const pb = foodPct(b).pct;
  if (pa == null && pb == null) return a.name.localeCompare(b.name, 'ar');
  if (pa == null) return 1;
  if (pb == null) return -1;
  return pb - pa || a.name.localeCompare(b.name, 'ar');
}

export function lastTrialDate(food) {
  const ts = (food.trials || []).map((t) => t.date).sort();
  return ts.length ? ts[ts.length - 1] : null;
}
