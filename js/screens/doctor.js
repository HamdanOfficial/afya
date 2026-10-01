import { icon } from '../icons.js';

const ITEMS = [
  'حرارة، أو ألم في الظهر أو الجنب',
  'دم في البول',
  'رجوع الحرقان',
  'كثرة التبول أو الإلحاح تستمر أكثر من يومين بدون سبب واضح',
  'إمساك مستمر',
];

export default {
  title: 'متى أراجع الطبيب؟',
  back: 'today',
  mount(root) {
    root.innerHTML = `
      <section class="card">
        <h1 class="card-title" style="font-size:20px">${icon('doctor')}راجعي الطبيب إذا صار عندك:</h1>
        <ul class="doc-list">${ITEMS.map((t) => `<li>${icon('alert')}<span>${t}</span></li>`).join('')}</ul>
      </section>
      <p class="note">التطبيق ما يشخّص. إذا حسيتي إن فيه شي غريب، الطبيب أولى.</p>`;
    return {};
  },
};
