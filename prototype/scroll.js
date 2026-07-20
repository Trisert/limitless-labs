// scroll.js — light parallax on hero text only (never hides content)
(function () {
  // Mark JS as available.
  document.documentElement.classList.add('js');

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  // Subtle parallax of hero TEXT (transform only — never opacity, so nothing can disappear)
  var hero = document.querySelector('.hero-3d .wrap');
  if (!hero) return;
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY;
      if (y < window.innerHeight) {
        hero.style.transform = 'translateY(' + (y * 0.18) + 'px)';
      }
      ticking = false;
    });
  }, { passive: true });
})();
