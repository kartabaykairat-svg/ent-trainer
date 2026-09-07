/**
 * Hero slider: автопереключение (fade/cross-dissolve) между слайдами
 * + лёгкий параллакс-эффект при скролле.
 * Без внешних зависимостей, уважает prefers-reduced-motion.
 */
(function () {
  const root = document.querySelector('[data-hero-slider]');
  if (!root) return;

  const slides = Array.from(root.querySelectorAll('.hero-slide'));
  const dots = Array.from(root.querySelectorAll('.hero-nav__dot'));
  if (slides.length < 2) return;

  const AUTOPLAY_MS = 5800; // 5-6 сек. на слайд
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let current = slides.findIndex((s) => s.classList.contains('is-active'));
  if (current < 0) current = 0;
  let timer = null;
  let hovered = false;

  function show(index) {
    slides[current].classList.remove('is-active');
    dots[current] && dots[current].removeAttribute('aria-current');
    current = (index + slides.length) % slides.length;
    slides[current].classList.add('is-active');
    if (dots[current]) {
      dots[current].setAttribute('aria-current', 'true');
      // перезапускаем CSS-анимацию заполнения точки
      dots[current].style.animation = 'none';
      // eslint-disable-next-line no-unused-expressions
      dots[current].offsetHeight;
      dots[current].style.animation = '';
    }
  }

  function next() {
    show(current + 1);
  }

  function start() {
    if (reduceMotion || hovered) return;
    stop();
    timer = window.setInterval(next, AUTOPLAY_MS);
  }

  function stop() {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      show(i);
      start();
    });
  });

  root.addEventListener('mouseenter', () => {
    hovered = true;
    stop();
  });
  root.addEventListener('mouseleave', () => {
    hovered = false;
    start();
  });
  root.addEventListener('focusin', () => {
    hovered = true;
    stop();
  });
  root.addEventListener('focusout', () => {
    hovered = false;
    start();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  start();

  // ---- Лёгкий параллакс при скролле (не активен при reduced-motion) ----
  if (!reduceMotion) {
    const grids = Array.from(root.querySelectorAll('.hero-slide__grid'));
    let ticking = false;

    function updateParallax() {
      ticking = false;
      const rect = root.getBoundingClientRect();
      const viewH = window.innerHeight || document.documentElement.clientHeight;
      if (rect.bottom < 0 || rect.top > viewH) return; // вне области видимости
      // прогресс скролла в пределах [-1, 1] относительно центра слайдера
      const progress = (rect.top) / viewH;
      const offset = progress * -46; // px, лёгкое смещение
      grids.forEach((g) => {
        g.style.transform = `translate3d(0, ${offset}px, 0)`;
      });
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(updateParallax);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    updateParallax();
  }
})();
