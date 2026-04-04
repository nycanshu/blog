/**
 * Global scroll-reveal animation.
 * Any element with class="reveal" will fade in + slide up when visible.
 * Works on all pages via Layout.astro.
 */
function initReveal() {
  const reveals = document.querySelectorAll<HTMLElement>(".reveal:not(.revealed)");
  if (!reveals.length) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (prefersReducedMotion) {
    reveals.forEach(el => el.classList.add("revealed"));
    return;
  }

  // Apply data-reveal-delay as inline transition-delay
  reveals.forEach(el => {
    const delay = el.dataset.revealDelay;
    if (delay) el.style.transitionDelay = `${delay}s`;
  });

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0, rootMargin: "0px 0px -40px 0px" }
  );

  reveals.forEach(el => observer.observe(el));
}

initReveal();
document.addEventListener("astro:page-load", initReveal);
