// iPhone Safari keeps website data separate from the Home Screen app, so ask her to install first.
import { icon } from '../icons.js';
import { logoSVG } from '../brand.js';

const SKIP_KEY = 'afya-install-skipped';

export function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export function isIOS(ua = navigator.userAgent, platform = navigator.platform, touch = navigator.maxTouchPoints) {
  return /iPhone|iPad|iPod/.test(ua) || (platform === 'MacIntel' && touch > 1);
}

export function shouldShowGate() {
  const forced = new URLSearchParams(location.search).has('gate');
  if (forced) return true;
  if (isStandalone() || !isIOS()) return false;
  try { return localStorage.getItem(SKIP_KEY) !== '1'; } catch { return true; }
}

export function mountGate(root, onContinue) {
  root.innerHTML = `
    <div class="gate">
      <div class="gate-logo">${logoSVG(undefined, 72)}</div>
      <h1>ثبّتي "عافية" على الشاشة الرئيسية</h1>
      <p class="muted">عشان يشتغل كتطبيق، وبدون نت، وتبقى بياناتك في مكان واحد.</p>
      <ol class="steps">
        <li><span class="num">1</span><span class="t">اضغطي زر المشاركة تحت في Safari</span>${icon('share')}</li>
        <li><span class="num">2</span><span class="t">انزلي واختاري "إضافة إلى الشاشة الرئيسية"</span>${icon('addSquare')}</li>
        <li><span class="num">3</span><span class="t">اضغطي "إضافة" فوق</span>${icon('check')}</li>
        <li><span class="num">4</span><span class="t">افتحي التطبيق من أيقونته على الشاشة الرئيسية</span>${logoSVG(undefined, 28)}</li>
      </ol>
      <button class="link-btn" data-continue>أكمل من المتصفح (بياناتك راح تكون منفصلة عن التطبيق المثبت)</button>
    </div>`;
  root.querySelector('[data-continue]').addEventListener('click', () => {
    try { localStorage.setItem(SKIP_KEY, '1'); } catch { /* private mode */ }
    onContinue();
  });
}
