/**
 * Global scroll-reveal animation.
 * Any element with class="reveal" will fade in + slide up when visible.
 * Works on all pages via Layout.astro.
 */
function initReveal() {
  const reveals = document.querySelectorAll(".reveal:not(.revealed)");
  if (!reveals.length) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (prefersReducedMotion) {
    reveals.forEach(el => el.classList.add("revealed"));
    return;
  }

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  reveals.forEach(el => observer.observe(el));
}

initReveal();
document.addEventListener("astro:page-load", initReveal);
