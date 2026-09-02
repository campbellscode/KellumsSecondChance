import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { useScrollReveal } from './useScrollReveal';

/**
 * Guards the contract between the reveal CSS and the observer that drives it.
 *
 * `<div data-reveal>` in JSX is `data-reveal={true}`, which React serialises as
 * `data-reveal="true"` — NOT `data-reveal=""`. A selector that assumes the empty
 * string matches nothing, the observer never runs, and every revealed element
 * stays at opacity 0 forever, because the CSS hides `[data-reveal]` up front.
 */

type ObserverCallback = (entries: IntersectionObserverEntry[]) => void;

let observed: Element[] = [];
let trigger: ObserverCallback | null = null;

class MockIntersectionObserver {
  constructor(callback: ObserverCallback) {
    trigger = callback;
  }
  observe(el: Element) {
    observed.push(el);
  }
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

function Harness() {
  useScrollReveal();
  return (
    <div>
      <h2 data-reveal>Heading</h2>
      <p data-reveal>Paragraph</p>
      <span data-reveal-clip>Clipped</span>
    </div>
  );
}

describe('useScrollReveal', () => {
  beforeEach(() => {
    observed = [];
    trigger = null;
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('serialises a bare JSX data-reveal as the string "true", not an empty value', () => {
    const { container } = render(<h2 data-reveal>Heading</h2>);

    expect(container.querySelector('h2')?.getAttribute('data-reveal')).toBe('true');
    // The trap this hook used to fall into.
    expect(document.querySelectorAll('[data-reveal=""]')).toHaveLength(0);
  });

  it('observes every reveal target on the page', () => {
    render(<Harness />);

    // Two [data-reveal] plus one [data-reveal-clip].
    expect(observed).toHaveLength(3);
  });

  it('marks an element visible when it enters the viewport', () => {
    const { container } = render(<Harness />);
    const heading = container.querySelector('h2');
    expect(heading).not.toBeNull();

    trigger?.([{ isIntersecting: true, target: heading! } as unknown as IntersectionObserverEntry]);

    expect(heading?.getAttribute('data-reveal')).toBe('is-visible');
  });

  it('marks a clip target visible on its own attribute', () => {
    const { container } = render(<Harness />);
    const clipped = container.querySelector('span');

    trigger?.([{ isIntersecting: true, target: clipped! } as unknown as IntersectionObserverEntry]);

    expect(clipped?.getAttribute('data-reveal-clip')).toBe('is-visible');
  });

  it('observes reveal targets inserted after the initial render', async () => {
    render(<Harness />);
    const lateCard = document.createElement('figure');
    lateCard.setAttribute('data-reveal', 'true');

    document.body.append(lateCard);

    await waitFor(() => expect(observed).toContain(lateCard));
    lateCard.remove();
  });

  it('leaves an element alone until it actually intersects', () => {
    const { container } = render(<Harness />);
    const heading = container.querySelector('h2');

    trigger?.([{ isIntersecting: false, target: heading! } as unknown as IntersectionObserverEntry]);

    expect(heading?.getAttribute('data-reveal')).toBe('true');
  });

  it('does nothing at all when the visitor has asked to reduce motion', () => {
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;

    render(<Harness />);

    // No observer is created, and the CSS leaves reduced-motion users' content visible.
    expect(observed).toHaveLength(0);
  });
});
