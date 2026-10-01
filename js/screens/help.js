// "شروحات كل قسم": picture cards drawn with the app's real components (they follow the theme)
// plus a button to replay the live tour of that section.
import { delegate } from '../ui.js';
import { icon } from '../icons.js';
import { ring } from './report.js';

const pct = (cls, text) => `<span class="pct pct-${cls}">${text}</span>`;
const rate = (cls, emoji, word) => `<span class="rating rating-${cls}">${emoji} ${word}</span>`;

const SECTIONS = [
  {
    id: 'today', title: 'اليوم', icon: 'today',
    shot: `<div class="card rings-card"><div class="rings">${ring(0.5, 'الماء اليوم', '4/8')}${ring(5 / 7, 'الدواء (7 أيام)', '5/7')}${ring(12 / 30, 'العلاج', '12/30')}</div></div>
      <div class="card"><p><b class="big">4</b> من 8 أكواب · 1000 مل</p><div class="water-row"><span class="btn btn-primary water-add">${icon('plus')} كوب</span><span class="btn btn-secondary water-minus">${icon('minus')}</span></div></div>`,
    points: ['فوق: ملخص يومك، والضغط عليه يفتح "تقريري" بالرسوم.', '"+ كوب" بعد كل كوب ماء، و"تراجع" لو غلطتي.', 'سجلي الأعراض والدواء بضغطة، وأي عرض يحتاج طبيب يطلع لك تنبيه.', 'من الخميس يذكرك تعبين جدول دوام الأسبوع الجاي.'],
  },
  {
    id: 'search', title: 'أقدر آكل؟', icon: 'search',
    shot: `<div class="search-wrap">${icon('search')}<div class="input search-input">بطاطس</div></div>
      <div class="card"><b>بطاطس</b><div class="food-meta">${rate('green', '🟢', 'آمن غالباً')}</div>
        <div class="variants" style="margin-top:8px">
          <div class="variant"><div class="row-between"><b>مسلوقة أو مهروسة</b>${rate('green', '🟢', 'آمن غالباً')}</div></div>
          <div class="variant"><div class="row-between"><b>ودجز متبلة</b>${rate('yellow', '🟡', 'بحذر')}</div></div>
          <div class="variant"><div class="row-between"><b>بطاطس حارة</b>${rate('red', '🔴', 'تجنبيه حالياً')}</div></div>
        </div></div>`,
    points: ['اكتبي أي جزء من الاسم، حتى بدون همزات.', 'كل أكلة لها طرق تحضير، ولكل طريقة تصنيفها.', 'إذا جربتيها قبل، يطلع رقمك أنتِ أول.', 'ما لقيتيها؟ "أضيفيها وجربيها".'],
  },
  {
    id: 'foods', title: 'أكلاتي', icon: 'foods',
    shot: `<div class="sort-bar"><div class="chips chips-sm"><span class="chip" aria-pressed="true">النسبة</span><span class="chip">الاسم</span><span class="chip">آخر تجربة</span></div><span class="btn btn-secondary btn-sm">${icon('arrowDown')} الأعلى أولاً</span></div>
      <div class="card food-item"><div class="food-name">رز ⭐</div><div class="food-meta">${pct('green', '100% · 3 تجارب')}</div></div>
      <div class="card food-item"><div class="food-name">الشاي</div><div class="food-meta">${pct('red', '0% · ولا تجربة <span class="tag">يدوي</span>')}</div></div>`,
    points: ['كل أكلة جربتيها مع نسبتها وعدد تجاربها.', 'رتّبي بالنسبة أو الاسم أو آخر تجربة، والزر يعكس الترتيب.', '"نفعني 100%" لو متأكدة إنها ما تتعبك.', 'الحذف يرجع بزر "تراجع" لمدة 5 ثواني.'],
  },
  {
    id: 'trials', title: 'تجاربي', icon: 'trials',
    shot: `<div class="card"><b>كوسة</b><p class="muted small">بديتي أمس</p><p style="margin:6px 0">كيف كانت الـ24 ساعة بعدها؟</p>
      <div class="btn-row"><span class="btn btn-secondary btn-sm">ما تعبتني</span><span class="btn btn-secondary btn-sm">تعب خفيف</span><span class="btn btn-secondary btn-sm">تعبتني</span></div></div>`,
    points: ['جربي أكلة وحدة بكمية صغيرة.', 'بعد 24 ساعة قيّميها بضغطة.', 'التقييم يحدّث نسبتها في أكلاتي تلقائياً.'],
  },
  {
    id: 'suggest', title: 'اقترح لي', icon: 'suggest',
    shot: `<div class="seg"><span class="chip" aria-pressed="true">تعبانة</span><span class="chip">عادي</span><span class="chip">نشيطة</span></div>
      <div class="card" style="margin-top:10px"><b>بيض مسلوق ⭐</b><div class="food-meta">${pct('green', '100% · تجربتين')}<span class="badge-src badge-mine">مجربة عندك</span></div></div>`,
    points: ['قولي له طاقتك، ويختار حسب الوقت ودوامك.', 'يقترح من أكلاتك العالية أول، وبعدين من المعلومات العامة 🟢.', '"غيّر" يجيب اقتراحات ثانية.'],
  },
  {
    id: 'claude', title: 'اسألي Claude', icon: 'sparkle', tour: null,
    shot: `<span class="fab" style="position:static;display:inline-flex">${icon('sparkle')}<span>اسألي Claude</span></span>`,
    points: ['اكتبي سؤالك (أو خليه فاضي).', '"انسخي وافتحي Claude" ينسخ بياناتك ويفتح Claude.', 'الصقي الرسالة هناك وأرسليها، وهو بيرد وهو فاهم وضعك.'],
  },
  {
    id: 'settings', title: 'الإعدادات', icon: 'gear',
    shot: `<div class="pal-grid">${['classic', 'national', 'girly'].map((p) => `<span class="pal"><span class="pal-prevs"><span class="pal-prev" data-palette="${p}" data-theme="light"><i></i><b></b></span><span class="pal-prev" data-palette="${p}" data-theme="dark"><i></i><b></b></span></span></span>`).join('')}</div>
      <span class="btn btn-secondary btn-block" style="margin-top:10px">${icon('calendar')} جدول الأسبوع الجاي</span>`,
    points: ['اختاري الألوان من خمس ثيمات (والنهاري والليلي من زر القمر فوق).', 'جدول الدوام لكل أسبوع، مع نسخ الأسبوع اللي فات.', 'النسخة الاحتياطية: صدّري ملف كل أسبوع واحفظيه.'],
  },
];

export default {
  title: 'الشروحات',
  back: 'settings',
  mount(root, _p, app) {
    root.innerHTML = `
      <section class="card">
        <p>تبين الشرح كامل بسرعة؟</p>
        <button class="btn btn-primary btn-block" data-act="tour" data-name="main" style="margin-top:10px">${icon('sparkle')} الجولة السريعة (أقل من دقيقة)</button>
      </section>
      ${SECTIONS.map((s) => `
        <section class="card help-card">
          <h2 class="card-title">${icon(s.icon)}${s.title}</h2>
          <div class="help-shot" aria-hidden="true"><div class="help-shot-inner">${s.shot}</div></div>
          <ul class="plain-list">${s.points.map((p) => `<li>${p}</li>`).join('')}</ul>
          ${s.tour === null ? '' : `<button class="btn btn-secondary btn-sm" data-act="tour" data-name="${s.id}" style="margin-top:10px">شوفي الشرح على الشاشة</button>`}
        </section>`).join('')}`;
    const off = delegate(root, { tour: (el) => app.startTour(el.dataset.name) });
    return { destroy: off };
  },
};
