import { Star } from 'lucide-react';
import styles from './StarRating.module.css';
import { cn } from '@/lib/cn';

interface StarRatingProps {
  /** 1–5. */
  value: number;
  size?: number;
  className?: string;
  /** Hides the text label when the surrounding copy already states the rating. */
  hideLabel?: boolean;
}

export function StarRating({ value, size = 16, className, hideLabel = false }: StarRatingProps) {
  const rounded = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span className={cn(styles.rating, className)}>
      <span className={styles.stars} aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            size={size}
            strokeWidth={1.4}
            className={cn(styles.star, i < rounded && styles.filled)}
          />
        ))}
      </span>
      <span className={hideLabel ? 'u-visually-hidden' : styles.label}>{rounded} out of 5</span>
    </span>
  );
}
