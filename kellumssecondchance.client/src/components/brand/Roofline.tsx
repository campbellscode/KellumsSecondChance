import styles from './Roofline.module.css';
import { cn } from '@/lib/cn';

interface RooflineProps {
  /** `rule` spans a section edge; `tick` is the small inline marker. */
  variant?: 'rule' | 'tick';
  tone?: 'accent' | 'muted';
  className?: string;
}

/**
 * The gable.
 *
 * The Kellum’s logo is built on one shape: a roof pitch over a house. This is
 * that pitch, reduced to a rule — so the section transitions, eyebrow markers
 * and list bullets across the site all rhyme with the mark instead of using the
 * abstract geometry the first build invented.
 *
 * Purely decorative; never announced to assistive technology.
 */
export function Roofline({ variant = 'rule', tone = 'accent', className }: RooflineProps) {
  if (variant === 'tick') {
    return <span className={cn(styles.tick, styles[tone], className)} aria-hidden="true" />;
  }

  return (
    <span className={cn(styles.rule, styles[tone], className)} aria-hidden="true">
      <span className={styles.ruleLine} />
      <svg className={styles.gable} viewBox="0 0 40 14" fill="none" preserveAspectRatio="none">
        <path
          d="M0 13 L20 1.5 L40 13"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={styles.ruleLine} />
    </span>
  );
}
