// In-memory app state, loaded from IndexedDB on start and written through on every change.
import * as db from './db.js';

export const state = {
  settings: {},
  foods: [],
  trials: [],
  days: {},
  alerts: {},
  treatments: [],
  ref: { categories: [], items: [] },
};

const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function notify() { for (const fn of listeners) fn(); }

export function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export async function loadRef(url = new URL('../data/reference.json', import.meta.url)) {
  const res = await fetch(url);
  state.ref = await res.json();
}

export async function loadAll() {
  const [kv, foods, trials, days, alerts, treatments] = await Promise.all(
    ['kv', 'foods', 'trials', 'days', 'alerts', 'treatments'].map((s) => db.getAll(s)),
  );
  state.settings = Object.fromEntries(kv.map((r) => [r.key, r.value]));
  state.foods = foods;
  state.trials = trials;
  state.days = Object.fromEntries(days.map((d) => [d.date, d]));
  state.alerts = Object.fromEntries(alerts.map((a) => [a.key, a]));
  state.treatments = treatments;
}

export const getSetting = (key, fallback) => (key in state.settings ? state.settings[key] : fallback);

export async function setSetting(key, value) {
  state.settings[key] = value;
  await db.put('kv', { key, value });
  notify();
}

export async function saveFood(food) {
  const i = state.foods.findIndex((f) => f.id === food.id);
  if (i >= 0) state.foods[i] = food; else state.foods.push(food);
  await db.put('foods', food);
  notify();
  return food;
}

export async function removeFood(id) {
  state.foods = state.foods.filter((f) => f.id !== id);
  await db.del('foods', id);
  notify();
}

export async function saveTrial(trial) {
  const i = state.trials.findIndex((t) => t.id === trial.id);
  if (i >= 0) state.trials[i] = trial; else state.trials.push(trial);
  await db.put('trials', trial);
  notify();
  return trial;
}

export async function removeTrial(id) {
  state.trials = state.trials.filter((t) => t.id !== id);
  await db.del('trials', id);
  notify();
}

export function getDay(date) {
  return state.days[date] || { date };
}

export async function updateDay(date, patch) {
  const cur = getDay(date);
  const next = { ...cur, ...patch, date };
  if (patch.redFlags) next.redFlags = { ...(cur.redFlags || {}), ...patch.redFlags };
  next.updatedAt = Date.now();
  state.days[date] = next;
  await db.put('days', next);
  notify();
  return next;
}

export async function dismissAlert(key) {
  const rec = { key, at: Date.now() };
  state.alerts[key] = rec;
  await db.put('alerts', rec);
  notify();
}

export async function addTreatment(rec) {
  const r = { id: uid(), ...rec };
  state.treatments.push(r);
  await db.put('treatments', r);
  notify();
  return r;
}

export async function replaceEverything(data) {
  await db.replaceAll(data);
  await loadAll();
  notify();
}
