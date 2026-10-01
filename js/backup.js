// Backup export/import (JSON) and full wipe. Nothing leaves the device unless she shares the file herself.
import * as db from './db.js';
import { setSetting, replaceEverything } from './store.js';
import { APP_VERSION } from './version.js';
import { dayKey, now } from './dates.js';

const APP_ID = 'afya';
const SCHEMA = 1;

export async function buildBackup() {
  const data = await db.dumpAll();
  return { app: APP_ID, schema: SCHEMA, version: APP_VERSION, exportedAt: now().toISOString(), data };
}

export function backupFileName() {
  return `afya-backup-${dayKey()}.json`;
}

// Returns 'shared' | 'downloaded' | 'cancelled'
export async function exportBackup() {
  const backup = await buildBackup();
  const json = JSON.stringify(backup, null, 1);
  const name = backupFileName();
  const file = new File([json], name, { type: 'application/json' });
  let result = 'downloaded';
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      result = 'shared';
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelled';
      download(file, name);
    }
  } else {
    download(file, name);
  }
  await setSetting('lastExportAt', now().toISOString());
  return result;
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Throws an Error with an Arabic message if the file isn't a valid backup.
export function parseBackup(text) {
  let obj;
  try { obj = JSON.parse(text); } catch { throw new Error('الملف مو ملف نسخة احتياطية صالح.'); }
  if (!obj || obj.app !== APP_ID || typeof obj.data !== 'object') throw new Error('الملف مو نسخة احتياطية من عافية.');
  if (obj.schema > SCHEMA) throw new Error('النسخة من إصدار أحدث من التطبيق. حدّثي التطبيق أول.');
  for (const k of Object.keys(db.STORES)) {
    if (obj.data[k] != null && !Array.isArray(obj.data[k])) throw new Error('الملف ناقص أو خربان.');
  }
  return obj;
}

export async function importBackup(obj) {
  await replaceEverything(obj.data);
}

export async function wipeAll() {
  await replaceEverything({});
}
