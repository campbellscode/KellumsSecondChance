import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { MoveHorizontal } from 'lucide-react';
import styles from './BeforeAfterSlider.module.css';
import { cn } from '@/lib/cn';
import type { ImageAsset } from '@/lib/api/types';

interface BeforeAfterSliderProps {
  before: ImageAsset;
  after: ImageAsset;
  /** Describes the pair for assistive tech, e.g. "Maple Street kitchen". */
  label: string;
  /** Starting divider position, 0–100. */
  initial?: number;
  className?: string;
  ratio?: 'landscape' | 'classic' | 'wide' | 'portrait' | 'square';
  sizes?: string;
  priority?: boolean;
  beforeLabel?: string;
  afterLabel?: string;
}

const clamp = (value: number) => Math.min(100, Math.max(0, value));

/**
 * THE SECOND CHANCE REVEAL.
 *
 * The brand's signature interaction: drag the copper seam to wipe a worn room
 * away and reveal the finished one.
 *
 * Accessibility: the handle is a real ARIA slider. Arrow keys move it in 2%
 * steps (10% with Page Up/Down), Home/End snap to the extremes, and both images
 * carry independent alt text so a screen-reader user gets the full comparison
 * without operating the control at all.
 */
export function BeforeAfterSlider({
  before,
  after,
  label,
  initial = 50,
  className,
  ratio = 'landscape',
  sizes = '(min-width: 64rem) 60vw, 100vw',
  priority = false,
  beforeLabel = 'Before',
  afterLabel = 'After',
}: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(() => clamp(initial));
  const [isDragging, setIsDragging] = useState(false);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const labelId = useId();

  const setFromClientX = useCallback((clientX: number) => {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    if (rect.width === 0) return;
    setPosition(clamp(((clientX - rect.left) / rect.width) * 100));
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      // Ignore secondary buttons so right-click never hijacks the drag.
      if (event.button !== 0 && event.pointerType === 'mouse') return;
      pointerIdRef.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsDragging(true);
      setFromClientX(event.clientX);
    },
    [setFromClientX],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== event.pointerId) return;
      setFromClientX(event.clientX);
    },
    [setFromClientX],
  );

  const endDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    pointerIdRef.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
    const steps: Record<string, number> = {
      ArrowLeft: -2,
      ArrowRight: 2,
      ArrowDown: -2,
      ArrowUp: 2,
      PageDown: -10,
      PageUp: 10,
    };
    if (event.key in steps) {
      event.preventDefault();
      setPosition((current) => clamp(current + (steps[event.key] ?? 0)));
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      setPosition(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setPosition(100);
    }
  }, []);

  // Releasing the pointer outside the window should not leave the slider stuck.
  useEffect(() => {
    if (!isDragging) return;
    const stop = () => {
      pointerIdRef.current = null;
      setIsDragging(false);
    };
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
  }, [isDragging]);

  const rounded = Math.round(position);

  return (
    <div
      className={cn(styles.root, styles[ratio], isDragging && styles.dragging, className)}
      ref={frameRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      style={{ ['--pos' as string]: `${position}%` }}
    >
      <span id={labelId} className="u-visually-hidden">
        {`${label}: before and after comparison. Use the left and right arrow keys to wipe between them.`}
      </span>

      {/* AFTER sits underneath and is revealed as the seam travels left. */}
      <img
        className={styles.image}
        src={after.src}
        width={after.width}
        height={after.height}
        alt={after.alt}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        draggable={false}
      />

      <div className={styles.beforeClip} aria-hidden={rounded === 0}>
        <img
          className={styles.image}
          src={before.src}
          width={before.width}
          height={before.height}
          alt={before.alt}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          draggable={false}
        />
      </div>

      <span className={cn(styles.tag, styles.tagBefore)} aria-hidden="true">
        {beforeLabel}
      </span>
      <span className={cn(styles.tag, styles.tagAfter)} aria-hidden="true">
        {afterLabel}
      </span>

      <div className={styles.seam} aria-hidden="true">
        <span className={styles.seamLine} />
      </div>

      <button
        type="button"
        className={styles.handle}
        role="slider"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={rounded}
        aria-valuetext={`${rounded}% revealed — ${rounded < 50 ? afterLabel : beforeLabel} showing`}
        aria-orientation="horizontal"
        onKeyDown={handleKeyDown}
      >
        <span className={styles.handleFace}>
          <MoveHorizontal size={18} strokeWidth={2} aria-hidden="true" />
        </span>
        <span className="u-visually-hidden">Drag or use arrow keys to compare</span>
      </button>
    </div>
  );
}
