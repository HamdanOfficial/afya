// Arabic text normalization for search and matching.

const DIACRITICS = /[ً-ْٰـ]/g; // tashkeel + superscript alef + tatweel

export function normalize(s) {
  return String(s ?? '')
    .replace(DIACRITICS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Stronger key for whole-name matching: also drops the definite article "ال"
// from each word, so "الشاي" matches "شاي" and "الماتشا المحلاة" matches "ماتشا محلاة".
export function matchKey(s) {
  return normalize(s)
    .split(' ')
    .map((w) => (w.length > 3 && w.startsWith('ال') ? w.slice(2) : w))
    .join(' ');
}

// Does the query appear (partially) in any of the given names?
export function matchesAny(query, names) {
  const q = normalize(query);
  if (!q) return false;
  const qk = matchKey(query);
  return names.some((n) => {
    const nn = normalize(n);
    return nn.includes(q) || matchKey(n).includes(qk);
  });
}

// Is the query an exact (normalized) match of any of the names?
export function exactAny(query, names) {
  const qk = matchKey(query);
  return !!qk && names.some((n) => matchKey(n) === qk);
}
