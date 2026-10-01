// First-run setup: 4 steps, each skippable.
import { setSetting } from '../store.js';
import { chips, bindChips } from '../ui.js';
import { WEEKDAYS, now } from '../dates.js';
import { CUP_SIZES, DEFAULT_DURATION, DEFAULT_WATER, DEFAULT_WORK } from '../profile.js';
import { dateFieldHTML, bindDateField } from '../flows.js';

const DAY_OPTS = WEEKDAYS.map((label, id) => ({ id: String(id), label }));
const TOTAL = 4;

export function mountOnboarding(root, onDone) {
  let step = 1;

  const shell = (title, body) => `
    <div class="onb">
      <div class="dots" aria-hidden="true">${Array.from({ length: TOTAL }, (_, i) => `<i class="${i < step ? 'on' : ''}"></i>`).join('')}</div>
      <p class="onb-step">الخطوة ${step} من ${TOTAL}</p>
      <h1>${title}</h1>
      ${body}
      <div class="onb-actions">
        <button class="btn btn-primary" data-next>${step === TOTAL ? 'خلصنا' : 'التالي'}</button>
        <button class="btn btn-secondary" data-skip>تخطي</button>
      </div>
    </div>`;

  const steps = {
    1: {
      html: () => shell('علاج المثانة العصبية', `
        ${dateFieldHTML('start', null, 'متى بديتي الدواء؟')}
        <label class="field"><span>كم مدة العلاج؟ (بالأيام)</span>
          <input class="input" type="number" inputmode="numeric" min="1" max="365" name="dur" value="${DEFAULT_DURATION}"></label>`),
      bind() {
        const read = bindDateField(root, 'start');
        return async () => {
          const v = read();
          if (!v) return false;
          const dur = Math.max(1, Math.min(365, parseInt(root.querySelector('[name=dur]').value, 10) || DEFAULT_DURATION));
          await setSetting('treatment', { ...v, durationDays: dur });
          return true;
        };
      },
    },
    2: {
      html: () => shell('المضاد الحيوي', dateFieldHTML('ab', null, 'متى خلصتي آخر مضاد؟')),
      bind() {
        const read = bindDateField(root, 'ab');
        return async () => {
          const v = read();
          if (!v) return false;
          await setSetting('antibiotic', v);
          return true;
        };
      },
    },
    3: {
      html: () => shell('الدوام', `
        <div class="field"><span>أيام الدوام</span>${chips('days', DAY_OPTS, DEFAULT_WORK.days.map(String), { multi: true, small: true })}</div>
        <div class="time-row">
          <label class="field"><span>من</span><input class="input" type="time" name="from" value="${DEFAULT_WORK.from}"></label>
          <label class="field"><span>إلى</span><input class="input" type="time" name="to" value="${DEFAULT_WORK.to}"></label>
        </div>
        <p class="note">إذا أوقاتك تتغير كل أسبوع: حطي هنا جدولك المعتاد، وبعدين تعبين جدول كل أسبوع بضغطة من شاشة "اليوم" أو الإعدادات.</p>`),
      bind() {
        let days = DEFAULT_WORK.days.map(String);
        bindChips(root, (_k, v) => { days = v; });
        return async () => {
          await setSetting('work', {
            days: days.map(Number).sort(),
            from: root.querySelector('[name=from]').value,
            to: root.querySelector('[name=to]').value,
          });
          return true;
        };
      },
    },
    4: {
      html: () => shell('الماء', `
        <div class="field"><span>حجم الكوب اللي تستخدمينه</span>
          ${chips('cup', [...CUP_SIZES.map((n) => ({ id: String(n), label: `${n} مل` })), { id: 'other', label: 'رقم آخر' }], String(DEFAULT_WATER.cupMl), { small: true })}</div>
        <label class="field" data-other hidden><span>كم مل؟</span><input class="input" type="number" inputmode="numeric" min="50" max="2000" name="cupMl"></label>
        <label class="field"><span>الهدف اليومي بالأكواب</span><input class="input" type="number" inputmode="numeric" min="1" max="30" name="goal" value="${DEFAULT_WATER.goalCups}"></label>
        <p class="note">اسألي طبيبك عن الكمية المناسبة لك.</p>`),
      bind() {
        let cup = String(DEFAULT_WATER.cupMl);
        bindChips(root, (_k, v) => {
          cup = v || '';
          root.querySelector('[data-other]').hidden = cup !== 'other';
          if (cup === 'other') root.querySelector('[name=cupMl]').focus();
        });
        return async () => {
          const cupMl = cup === 'other' ? parseInt(root.querySelector('[name=cupMl]').value, 10) : Number(cup);
          const goal = parseInt(root.querySelector('[name=goal]').value, 10);
          if (!(cupMl > 0) || !(goal > 0)) return false;
          await setSetting('water', { cupMl, goalCups: goal });
          return true;
        };
      },
    },
  };

  const finish = async () => {
    await setSetting('firstUseAt', now().toISOString());
    await setSetting('onboardingDone', true);
    onDone();
  };

  const show = () => {
    root.innerHTML = steps[step].html();
    window.scrollTo(0, 0);
    const save = steps[step].bind();
    const advance = async () => { if (step < TOTAL) { step++; show(); } else await finish(); };
    root.querySelector('[data-next]').addEventListener('click', async () => {
      const ok = await save();
      if (!ok) {
        const msg = root.querySelector('.onb-msg') || Object.assign(document.createElement('p'), { className: 'note onb-msg' });
        msg.textContent = 'كملي الخانة أو اضغطي "تخطي".';
        root.querySelector('.onb-actions').before(msg);
        return;
      }
      advance();
    });
    root.querySelector('[data-skip]').addEventListener('click', advance);
  };
  show();
}
