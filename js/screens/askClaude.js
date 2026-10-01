// "اسألي Claude": copies a full context message and opens claude.ai — no API involved.
import { openSheet, esc } from '../ui.js';
import { icon } from '../icons.js';
import { buildPrompt } from '../claudePrompt.js';

const CLAUDE_URL = 'https://claude.ai/new';

async function copyText(text) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('no clipboard');
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function openAskClaude() {
  openSheet({
    title: 'اسألي Claude',
    body: `
      <label class="field"><span>وش تبين تسألين؟ (اختياري)</span>
        <textarea class="input" name="q" placeholder="مثلاً: أقدر آكل كبسة الليلة؟"></textarea></label>
      <div class="btn-col">
        <button class="btn btn-primary" data-copy-open>${icon('copy')} انسخي وافتحي Claude</button>
        <button class="btn btn-secondary" data-copy>انسخي فقط</button>
      </div>
      <div data-result style="margin-top:14px"></div>
      <p class="note" style="margin-top:12px">ينسخ بياناتك (أكلاتك، تجاربك، آخر 7 أيام) مع سؤالك. ما يطلع شي إلا لما تلصقينه أنتِ.</p>`,
    onMount(el) {
      const result = el.querySelector('[data-result]');
      const run = async (open) => {
        const text = buildPrompt(el.querySelector('[name=q]').value);
        // Both the copy and the new tab must start synchronously inside the tap, or iOS blocks them.
        const copying = copyText(text);
        if (open) window.open(CLAUDE_URL, '_blank');
        const ok = await copying;
        if (ok) {
          result.innerHTML = `<div class="alert alert-info"><div class="alert-title">${icon('check')}تم النسخ ✅</div><p>الصقيه في Claude وأرسليه.</p></div>`;
        } else {
          result.innerHTML = `<p class="small" style="margin-bottom:8px">ما قدرت أنسخ تلقائياً. حددي النص وانسخيه:</p>
            <textarea class="input" readonly data-out style="min-height:200px;font-size:14px">${esc(text)}</textarea>
            <div class="btn-row" style="margin-top:8px">
              <button class="btn btn-secondary btn-sm" data-select>حددي الكل</button>
              <a class="btn btn-outline btn-sm" href="${CLAUDE_URL}" target="_blank" rel="noopener">افتحي Claude ${icon('external')}</a>
            </div>`;
          const out = result.querySelector('[data-out]');
          result.querySelector('[data-select]').addEventListener('click', () => { out.focus(); out.select(); out.setSelectionRange(0, out.value.length); });
        }
      };
      el.querySelector('[data-copy-open]').addEventListener('click', () => run(true));
      el.querySelector('[data-copy]').addEventListener('click', () => run(false));
    },
  });
}
