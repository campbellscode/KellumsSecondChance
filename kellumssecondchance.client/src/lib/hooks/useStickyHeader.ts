import { useEffect, useState } from 'react';

export interface StickyHeaderState {
  readonly isScrolled: boolean;
  readonly isHidden: boolean;
}

/**
 * Tracks scroll for the header: compacts after `threshold`, and hides on
 * downward scroll past `hideAfter` so the content gets the full viewport.
 */
export function useStickyHeader(threshold = 24, hideAfter = 560): StickyHeaderState {
  const [state, setState] = useState<StickyHeaderState>({ isScrolled: false, isHidden: false });

  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const goingDown = y > lastY + 4;
      const goingUp = y < lastY - 4;

      setState((current) => {
        const isScrolled = y > threshold;
        let isHidden = current.isHidden;
        if (goingDown && y > hideAfter) isHidden = true;
        else if (goingUp || y <= hideAfter) isHidden = false;
        if (isScrolled === current.isScrolled && isHidden === current.isHidden) return current;
        return { isScrolled, isHidden };
      });

      if (goingDown || goingUp) lastY = y;
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [threshold, hideAfter]);

  return state;
}
