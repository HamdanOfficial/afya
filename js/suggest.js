// Rule-based meal suggestions from "أكلاتي", topped up with 🟢 reference items.
import { resolve, personalForRef } from './scoring.js';

export function mealForHour(h) {
  if (h >= 5 && h < 11) return 'breakfast';
  if (h >= 11 && h < 16) return 'lunch';
  if (h >= 16 && h < 19) return 'snack';
  if (h >= 19) return 'dinner';
  return 'snack';
}

export const ENERGY = [
  { id: 'tired', label: 'تعبانة' },
  { id: 'normal', label: 'عادي' },
  { id: 'active', label: 'نشيطة' },
];

const CONF_RANK = { high: 0, medium: 1, low: 2 };

/**
 * Full ranked list; the UI shows 3 at a time and "غيّر" moves through it.
 * Each entry: { type: 'personal'|'ref', food, refItem, res }
 */
export function rankSuggestions({ meal, energy = 'normal', workDay = false }, foods, ref) {
  const easyMode = energy === 'tired' || workDay;
  const personal = [];
  for (const food of foods) {
    if (food.kind === 'category') continue;
    const types = food.mealTypes || [];
    if (types.length && !types.includes(meal)) continue;
    const res = resolve({ food }, foods, ref);
    if (res.pct == null || res.pct < 80) continue; // also drops anything under 50%
    let score = res.pct / 10;
    if (food.favorite) score += 100;
    if (easyMode && (food.prep === 'quick' || food.source === 'home' || food.source === 'out')) score += 50;
    if (types.includes(meal)) score += 20;
    personal.push({ type: 'personal', food, refItem: res.refItem, res, score });
  }
  personal.sort((a, b) => b.score - a.score || a.food.name.localeCompare(b.food.name, 'ar'));

  const refs = [];
  for (const r of ref.items) {
    if (r.rating !== 'green' || !r.mealTypes.includes(meal)) continue;
    if (r.variants?.length) continue; // suggest the concrete variant ("بطاطس مسلوقة"), not the umbrella item
    if (personalForRef(r, foods)) continue; // already covered (or excluded) by her own list
    const res = resolve({ refItem: r }, foods, ref);
    if (res.source === 'category' && res.pct < 50) continue;
    refs.push({ type: 'ref', food: null, refItem: r, res });
  }
  refs.sort((a, b) => CONF_RANK[a.refItem.confidence] - CONF_RANK[b.refItem.confidence]);

  return [...personal, ...refs];
}

export function pageOf(list, page, size = 3) {
  if (!list.length) return [];
  const start = (page * size) % list.length;
  const out = [];
  for (let i = 0; i < Math.min(size, list.length); i++) out.push(list[(start + i) % list.length]);
  return out;
}
