// scroll.js — IntersectionObserver reveal + parallax on hero text
(function () {
  // Mark JS as available so CSS can safely hide .reveal only when we can reveal them.
  document.documentElement.classList.add('js');

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Reveal sections as they enter the viewport
  var els = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    els.forEach(function (e) { e.classList.add('is-visible'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-visible');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  // Subtle parallax of hero TEXT (.hero .wrap) relative to scroll
  if (!reduceMotion) {
    var hero = document.querySelector('.hero-3d .wrap');
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      if (y < window.innerHeight && hero) {
        hero.style.transform = 'translateY(' + (y * 0.18) + 'px)';
        hero.style.opacity = String(Math.max(0, 1 - y / (window.innerHeight * 0.7)));
      }
    }, { passive: true });
  }
})();
