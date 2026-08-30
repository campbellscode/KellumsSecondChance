import styles from './Logo.module.css';
import { cn } from '@/lib/cn';
import { business } from '@/content/business';

interface LogoMarkProps {
  size?: number;
  className?: string;
  /** Suppresses the hover animation for static contexts like the footer. */
  still?: boolean;
}

/**
 * The Kellum's mark.
 *
 * A drawn square: the left half is a worn, broken outline; the right half is
 * solid and true, with a copper seam down the centre. It is the before/after
 * slider reduced to a glyph — the same idea the whole brand runs on.
 */
export function LogoMark({ size = 34, className, still = false }: LogoMarkProps) {
  return (
    <svg
      className={cn(styles.mark, still && styles.still, className)}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* Worn half — dashed, thinner, unresolved corners. */}
      <path
        className={styles.worn}
        d="M20 4 H8 a4 4 0 0 0-4 4 V32 a4 4 0 0 0 4 4 H20"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="5 3.5"
        strokeLinecap="round"
        opacity="0.42"
      />
      {/* Restored half — solid, confident. */}
      <path
        className={styles.restored}
        d="M20 4 H32 a4 4 0 0 1 4 4 V32 a4 4 0 0 1-4 4 H20"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* The seam. */}
      <path className={styles.seam} d="M20 2.5 V37.5" stroke="var(--copper-400)" strokeWidth="2" strokeLinecap="round" />
      {/* Interior fill on the restored side: the room that came back. */}
      <path className={styles.fill} d="M21.6 9 H31 v22 h-9.4 z" fill="var(--copper-400)" opacity="0.16" />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  /** `stacked` puts the tagline under the wordmark — used in the footer. */
  layout?: 'inline' | 'stacked';
  markSize?: number;
  still?: boolean;
}

export function Logo({ className, layout = 'inline', markSize = 34, still = false }: LogoProps) {
  return (
    <span className={cn(styles.logo, styles[layout], className)}>
      <LogoMark size={markSize} still={still} />
      <span className={styles.wordmarkGroup}>
        <span className={styles.wordmark}>
          <span className={styles.name}>Kellum&rsquo;s</span>
          <span className={styles.suffix}>Second Chance Renovations</span>
        </span>
        {layout === 'stacked' ? (
          <span className={styles.tagline}>{business.tagline}</span>
        ) : null}
      </span>
    </span>
  );
}
