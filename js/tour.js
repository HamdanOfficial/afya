// Live guided tour: highlights the real buttons on screen, one short sentence each (under a minute in total).
import { getSetting, setSetting } from './store.js';
import { esc } from './ui.js';

// Each step: route to show, element to highlight (optional), title and one short sentence.
export const TOURS = {
  main: [
    { route: 'today', target: '[data-tour="today-rings"]', title: 'ملخص يومك', text: 'الماء والدواء والعلاج بنظرة وحدة. اضغطي عليه يفتح تقريرك.' },
    { route: 'today', target: '[data-tour="today-water"]', title: 'الماء', text: 'كل كوب تشربينه اضغطي "+ كوب". غلطتي؟ "تراجع" أو زر الناقص.' },
    { route: 'today', target: '[data-tour="today-symptoms"]', title: 'الأعراض', text: 'سجّلي إحساسك اليوم بضغطة وحدة.' },
    { route: 'today', target: '#doctor-btn', title: 'متى أراجع الطبيب؟', text: 'دايم موجود هنا فوق.' },
    { route: 'today', target: '[data-route="search"]', title: 'أقدر آكل؟', text: 'اكتبي أي أكلة، ويطلع لك هل تناسبك وطرق تحضيرها.' },
    { route: 'today', target: '[data-route="foods"]', title: 'أكلاتي', text: 'قائمتك أنتِ: كل أكلة جربتيها ونسبتها.' },
    { route: 'today', target: '[data-route="trials"]', title: 'تجاربي', text: 'جربي أكلة جديدة، وبعد 24 ساعة قيّميها.' },
    { route: 'today', target: '[data-route="suggest"]', title: 'اقترح لي', text: 'وش تاكلين الحين حسب وقتك وطاقتك.' },
    { route: 'today', target: '#fab', title: 'اسألي Claude', text: 'ينسخ بياناتك عشان تسألينه وهو فاهم وضعك.' },
    { route: 'today', target: '#gear-btn', title: 'الإعدادات', text: 'الألوان، جدول الدوام، النسخة الاحتياطية، والشروحات.' },
  ],
  today: [
    { route: 'today', target: '[data-tour="today-rings"]', title: 'ملخص يومك', text: 'الحلقات تمتلي مع يومك. اضغطي عليها يفتح "تقريري" بالرسوم.' },
    { route: 'today', target: '[data-tour="today-work"]', title: 'اليوم دوام؟', text: 'ياخذ قيمته من جدول الأسبوع. تغيرينه ليوم واحد بس من هنا.' },
    { route: 'today', target: '[data-tour="today-water"]', title: 'الماء', text: '"+ كوب" بعد كل كوب. الناقص يصحح العدد بأي وقت.' },
    { route: 'today', target: '[data-tour="today-med"]', title: 'الدواء', text: 'علّمي بعد ما تاخذين الحبة.' },
    { route: 'today', target: '[data-tour="today-symptoms"]', title: 'الأعراض', text: 'الإلحاح والحرقان والإمساك. الضغطة الثانية تلغي الاختيار.' },
    { route: 'today', target: '[data-tour="today-flags"]', title: 'أعراض تحتاج طبيب', text: 'إذا علّمتي وحدة، يطلع لك تنبيه أحمر فوق.' },
  ],
  foods: [
    { route: 'foods', target: '[data-tour="foods-add"]', title: 'أضيفي أكلة', text: 'أي أكلة أو فئة (مثل الحوامض).' },
    { route: 'foods', target: '[data-tour="foods-filter"]', title: 'الفلترة', text: 'فطور، غدا، مشروبات، المفضلة… بضغطة.' },
    { route: 'foods', target: '[data-tour="foods-sort"]', title: 'الترتيب', text: 'اختاري حسب وش ترتبين، والزر يعكس الترتيب (الأعلى أو الأقل أولاً).' },
    { route: 'foods', target: '[data-tour="foods-item"]', title: 'كل أكلة', text: '"سجلي تجربة"، "نفعني 100%"، والنجمة للمفضلة. اضغطي الاسم للتفاصيل.' },
  ],
  search: [
    { route: 'search', target: '[data-tour="search-input"]', title: 'ابحثي', text: 'اكتبي جزء من الاسم، حتى بدون همزات: "شاهي"، "كبسه"، "ارز".' },
    { route: 'search', target: null, title: 'طرق التحضير', text: 'الأكلة الوحدة لها أكثر من تصنيف: البطاطس المسلوقة غير المقلية الحارة.' },
    { route: 'search', target: null, title: 'الأولوية لتجربتك', text: 'إذا جربتيها، يطلع لك رقمك أنتِ قبل المعلومة العامة.' },
  ],
  trials: [
    { route: 'trials', target: '[data-tour="trials-new"]', title: 'ابدئي تجربة', text: 'كمية صغيرة، وأكلة وحدة بالمرة أفضل.' },
    { route: 'trials', target: '[data-tour="trials-active"]', title: 'بعد 24 ساعة', text: 'تطلع لك أزرار التقييم هنا وفي شاشة اليوم.' },
  ],
  suggest: [
    { route: 'suggest', target: '[data-tour="suggest-energy"]', title: 'طاقتك', text: 'إذا تعبانة، يقدّم لك السريع والجاهز.' },
    { route: 'suggest', target: '[data-tour="suggest-meal"]', title: 'الوجبة', text: 'تنختار حسب الساعة، وتقدرين تغيرينها.' },
    { route: 'suggest', target: '[data-tour="suggest-list"]', title: 'الاقتراحات', text: 'من أكلاتك اللي نسبتها عالية أول، و"غيّر" يجيب غيرها.' },
  ],
  settings: [
    { route: 'settings', target: '[data-tour="settings-theme"]', title: 'الألوان', text: 'خمس ثيمات، وكل وحدة لها نهاري وليلي.' },
    { route: 'settings', target: '[data-tour="settings-schedule"]', title: 'جدول الدوام', text: 'عبّي جدول كل أسبوع، أو انسخي الأسبوع اللي فات.' },
    { route: 'settings', target: '[data-tour="settings-backup"]', title: 'النسخة الاحتياطية', text: 'مرة بالأسبوع: تصدير، واحفظي الملف.' },
  ],
};

let active = null;

export function stopTour() {
  if (!active) return;
  active.el.remove();
  window.removeEventListener('resize', active.place);
  window.removeEventListener('scroll', active.place, true);
  active.app.touring = false;
  active = null;
}

export async function startTour(app, name = 'main') {
  stopTour();
  const steps = TOURS[name];
  if (!steps) return;
  const el = document.createElement('div');
  el.className = 'tour';
  el.innerHTML = '<div class="tour-spot"></div><div class="tour-bubble" role="dialog" aria-live="polite"></div>';
  document.body.appendChild(el);
  const spot = el.querySelector('.tour-spot');
  const bubble = el.querySelector('.tour-bubble');
  let i = 0;
  let target = null;
  app.touring = true;

  const place = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (target && target.isConnected) {
      const r = target.getBoundingClientRect();
      const pad = 6;
      Object.assign(spot.style, { display: 'block', left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
      el.classList.remove('no-target');
      const bh = bubble.offsetHeight;
      const below = r.bottom + 14 + bh < vh - 10;
      bubble.style.top = below ? `${r.bottom + 14}px` : `${Math.max(10, r.top - 14 - bh)}px`;
    } else {
      spot.style.display = 'none';
      el.classList.add('no-target');
      bubble.style.top = `${Math.max(20, (vh - bubble.offsetHeight) / 2)}px`;
    }
    bubble.style.left = `${Math.max(12, (vw - bubble.offsetWidth) / 2)}px`;
  };

  const finish = async () => {
    stopTour();
    if (name === 'main' && !getSetting('tourDone')) await setSetting('tourDone', true);
  };

  const show = async () => {
    const s = steps[i];
    if (app.currentRoute() !== s.route) app.go(s.route);
    // Let the screen render first (with a timer fallback: animation frames pause in background tabs).
    await new Promise((r) => { requestAnimationFrame(() => requestAnimationFrame(r)); setTimeout(r, 80); });
    target = s.target ? document.querySelector(s.target) : null;
    if (target) {
      const r = target.getBoundingClientRect();
      if (r.top < 70 || r.bottom > window.innerHeight - 140) {
        target.scrollIntoView({ block: 'center' });
      }
    }
    bubble.innerHTML = `
      <p class="tour-step">${i + 1} من ${steps.length}</p>
      <h2 class="tour-title">${esc(s.title)}</h2>
      <p>${esc(s.text)}</p>
      <div class="tour-actions">
        <button class="btn btn-primary btn-sm" data-next>${i === steps.length - 1 ? 'خلصنا' : 'التالي'}</button>
        ${i > 0 ? '<button class="btn btn-secondary btn-sm" data-prev>السابق</button>' : ''}
        <button class="btn btn-ghost btn-sm" data-skip>${i === steps.length - 1 ? '' : 'تخطي الجولة'}</button>
      </div>`;
    if (i === steps.length - 1) bubble.querySelector('[data-skip]').remove();
    bubble.querySelector('[data-next]').onclick = () => { if (i < steps.length - 1) { i++; show(); } else finish(); };
    bubble.querySelector('[data-prev]')?.addEventListener('click', () => { i--; show(); });
    bubble.querySelector('[data-skip]')?.addEventListener('click', finish);
    place();
    bubble.querySelector('[data-next]').focus({ preventScroll: true });
  };

  active = { el, place, app };
  window.addEventListener('resize', place);
  window.addEventListener('scroll', place, true);
  el.addEventListener('keydown', (e) => { if (e.key === 'Escape') finish(); });
  await show();
}

export function maybeStartTour(app) {
  if (getSetting('tourDone')) return;
  setTimeout(() => startTour(app, 'main'), 400);
}
