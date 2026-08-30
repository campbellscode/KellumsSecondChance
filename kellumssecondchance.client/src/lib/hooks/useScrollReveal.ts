import { useEffect } from 'react';

/**
 * Reveals every `[data-reveal]` element once as it enters the viewport.
 *
 * A single document-level observer handles the whole page, so adding a reveal to
 * a component costs one attribute and no extra JavaScript. Elements are visible
 * by default in CSS — if this never runs (no JS, no IntersectionObserver, or
 * reduced motion) the page still renders completely.
 */
export function useScrollReveal(dependency?: unknown): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('IntersectionObserver' in window)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          if (el.hasAttribute('data-reveal')) el.setAttribute('data-reveal', 'is-visible');
          if (el.hasAttribute('data-reveal-clip')) el.setAttribute('data-reveal-clip', 'is-visible');
          observer.unobserve(el);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.06 },
    );

    /*
     * Match on attribute PRESENCE, not on an empty value.
     *
     * `<div data-reveal>` in JSX is `data-reveal={true}`, which React serialises
     * as data-reveal="true". A `[data-reveal=""]` selector matches nothing, the
     * observer never runs, and — because the CSS hides `[data-reveal]` up front —
     * every revealed element would stay at opacity 0 forever.
     */
    const targets = document.querySelectorAll<HTMLElement>(
      '[data-reveal]:not([data-reveal="is-visible"]), [data-reveal-clip]:not([data-reveal-clip="is-visible"])',
    );
    targets.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [dependency]);
}
