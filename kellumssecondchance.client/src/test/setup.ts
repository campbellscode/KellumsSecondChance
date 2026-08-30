import '@testing-library/jest-dom/vitest';

/**
 * jsdom implements neither of these, and several components read them on mount.
 * Defaults are chosen to exercise the motion-enabled path.
 */
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

if (!window.IntersectionObserver) {
  window.IntersectionObserver = class {
    readonly root = null;
    readonly rootMargin = '';
    readonly thresholds: readonly number[] = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  } as unknown as typeof window.IntersectionObserver;
}

// jsdom has no layout engine, so every element measures 0x0. The slider
// converts pointer positions against this box, so give it a real one.
Element.prototype.getBoundingClientRect = function getBoundingClientRect() {
  return {
    x: 0, y: 0, top: 0, left: 0, bottom: 400, right: 800, width: 800, height: 400,
    toJSON: () => ({}),
  } as DOMRect;
};

// Pointer capture is unimplemented in jsdom.
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.hasPointerCapture = () => false;
}

window.scrollTo = () => {};
