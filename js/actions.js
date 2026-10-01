// Domain actions on top of the store: foods, trials, seeding, profile conversions.
import { state, uid, saveFood, saveTrial, getSetting, setSetting } from './store.js';
import { refFor, refById, refCategory, personalForRef, categoryFood, foodNames } from './scoring.js';
import { exactAny } from './normalize.js';
import { now } from './dates.js';

export const MEALS = [
  { id: 'breakfast', label: 'فطور' },
  { id: 'lunch', label: 'غدا' },
  { id: 'dinner', label: 'عشا' },
  { id: 'snack', label: 'سناك' },
  { id: 'drink', label: 'مشروب' },
];
export const PREP = [
  { id: 'quick', label: 'سريع' },
  { id: 'medium', label: 'متوسط' },
  { id: 'long', label: 'طويل' },
];
export const SOURCES = [
  { id: 'cook', label: 'أطبخه' },
  { id: 'home', label: 'أكل البيت' },
  { id: 'out', label: 'من برا' },
];
export const labelOf = (list, id) => list.find((x) => x.id === id)?.label || '';

export const PRE_APP_NOTE = 'من تجربتك قبل التطبيق';

// Build a new personal food, auto-linking to the reference by name/alias.
export function buildFood(fields) {
  const name = String(fields.name || '').trim();
  const food = {
    id: uid(),
    name,
    kind: fields.kind || 'item',
    category: fields.category || '',
    mealTypes: fields.mealTypes || [],
    prep: fields.prep || '',
    source: fields.source || '',
    favorite: !!fields.favorite,
    notes: fields.notes || '',
    trials: fields.trials || [],
    manualPct: fields.manualPct ?? null,
    refId: null,
    aliases: [],
    createdAt: now().toISOString(),
  };
  linkToRef(food, fields.refItem);
  return food;
}

// Inherit reference aliases/category/meal types when the name matches.
export function linkToRef(food, refItem = null) {
  if (food.kind === 'category') {
    const cat = refCategory(food.name, state.ref);
    if (cat) food.aliases = [cat];
    return food;
  }
  const r = refItem || refFor(food.name, state.ref);
  if (r) {
    food.refId = r.id;
    food.aliases = [r.name, ...r.aliases].filter((n) => n !== food.name);
    if (!food.category) food.category = r.category;
    if (!food.mealTypes?.length) food.mealTypes = [...r.mealTypes];
  }
  return food;
}

// Find a personal item by name (or by its reference link).
export function findFoodByName(name) {
  const r = refFor(name, state.ref);
  if (r) {
    const p = personalForRef(r, state.foods);
    if (p) return p;
  }
  return state.foods.find((f) => exactAny(name, foodNames(f))) || null;
}

export async function ensureFood(name, refItem = null) {
  const existing = refItem ? personalForRef(refItem, state.foods) : findFoodByName(name);
  if (existing) return existing;
  return saveFood(buildFood({ name, refItem }));
}

export async function seedIfNeeded() {
  if (getSetting('seeded')) return;
  const t = now().toISOString();
  const seeds = [
    { name: 'الشاي', kind: 'item' },
    { name: 'القهوة', kind: 'item' },
    { name: 'الماتشا المحلاة', kind: 'item' },
    { name: 'الحوامض', kind: 'category' },
    { name: 'المعجنات', kind: 'category' },
  ];
  for (const s of seeds) {
    const f = buildFood({ ...s, manualPct: 0, notes: PRE_APP_NOTE });
    f.createdAt = t;
    await saveFood(f);
  }
  await setSetting('seeded', true);
}

// ---------- trials ----------

export const activeTrials = () => state.trials.filter((t) => t.status === 'active').sort((a, b) => a.startedAt.localeCompare(b.startedAt));
export const doneTrials = () => state.trials.filter((t) => t.status === 'done').sort((a, b) => (b.ratedAt || '').localeCompare(a.ratedAt || ''));
export const TRIAL_WAIT_MS = 24 * 60 * 60 * 1000;
export const trialReady = (t) => now() - new Date(t.startedAt) >= TRIAL_WAIT_MS;
export const readyTrials = () => activeTrials().filter(trialReady);

export async function startTrial({ name, food = null, refItem = null }) {
  if (!refItem && food?.refId) refItem = refById(food.refId, state.ref);
  if (!refItem && !food) refItem = refFor(name, state.ref);
  const trial = {
    id: uid(),
    foodId: food?.id || null,
    name: food?.name || name,
    refId: refItem?.id || null,
    startedAt: now().toISOString(),
    status: 'active',
    score: null,
    ratedAt: null,
  };
  return saveTrial(trial);
}

/**
 * Rate a trial. Adds the result to the food's history (creating the food if needed).
 * Returns { food, askManual } — askManual is true when the food has a manual percent,
 * so the UI should ask whether to go back to the calculated one.
 */
export async function rateTrial(trialId, score) {
  const trial = state.trials.find((t) => t.id === trialId);
  if (!trial) return {};
  let food = trial.foodId ? state.foods.find((f) => f.id === trial.foodId) : null;
  if (!food) {
    const refItem = refById(trial.refId, state.ref);
    food = await ensureFood(trial.name, refItem);
  }
  const ratedAt = now().toISOString();
  food = { ...food, trials: [...(food.trials || []), { date: ratedAt, score }] };
  await saveFood(food);
  await saveTrial({ ...trial, foodId: food.id, status: 'done', score, ratedAt });
  return { food, askManual: food.manualPct != null };
}

// ---------- quick food actions ----------

export async function toggleFavorite(food) {
  return saveFood({ ...food, favorite: !food.favorite });
}

export async function setManualPct(food, pct) {
  return saveFood({ ...food, manualPct: pct });
}

// ---------- "كملي ملفك" food answers ----------

// kind: 'bad' (0% manual), 'good' (one 100 trial, note "قبل التطبيق"), 'fav' (⭐)
export async function applyProfileFoods(kind, names) {
  const at = now().toISOString();
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const isCat = !!refCategory(name, state.ref) || !!categoryFood(name, state.foods);
    const existing = isCat ? categoryFood(name, state.foods) : findFoodByName(name);
    let f = existing ? { ...existing } : buildFood({ name, kind: isCat ? 'category' : 'item' });
    if (kind === 'fav') f.favorite = true;
    if (kind === 'bad') f.manualPct = 0;
    if (kind === 'good') {
      f.trials = [...(f.trials || []), { date: at, score: 100, note: 'قبل التطبيق' }];
      if (!f.notes) f.notes = 'قبل التطبيق';
    }
    await saveFood(f);
  }
}
