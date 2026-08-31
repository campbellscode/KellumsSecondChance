import styles from './Logo.module.css';
import { cn } from '@/lib/cn';
import { useSiteContent } from '@/lib/siteContentContext';

/**
 * ============================================================================
 *  THE KELLUM'S LOGO
 * ============================================================================
 *
 *  These are the business's OWN supplied assets, used unmodified. Nothing here
 *  redraws, recolours, stretches or reinterprets the artwork:
 *
 *    /brand/kellums-logo-lockup.png  The full mark — gable triangle, house,
 *                                    "SECOND CHANCE" arced up the sides,
 *                                    "KELLUMS RENOVATIONS" beneath. 733x594.
 *    /brand/kellums-mark.png         The house glyph on its own. 434x364.
 *    /brand/kellums-logo-full.jpg    The lockup plus "FREE ESTIMATES" and the
 *                                    phone number. Kept for reference/print;
 *                                    NOT used on the site, because a phone
 *                                    number baked into an image cannot be
 *                                    updated from configuration.
 *
 *  ⚠ ONE-COLOUR ARTWORK. Every supplied file is solid black on transparency,
 *    and no reversed (white) variant was provided. On dark surfaces the mark is
 *    therefore set on a bone plaque rather than recoloured — the artwork stays
 *    exactly as supplied, and a stamped sign-plate reads as deliberate against
 *    the site's architectural language.
 *
 *    If a white/reversed logo file is supplied later, add it as
 *    `kellums-logo-lockup-reversed.png`, point REVERSED_LOCKUP at it, and the
 *    plaque treatment can be dropped.
 * ============================================================================
 */

/** Intrinsic pixel dimensions of the supplied files — never guess these. */
const LOCKUP = { src: '/brand/logo-black.png', width: 733, height: 594 } as const;
const MARK = { src: '/brand/kellums-mark.png', width: 434, height: 364 } as const;

/** Describes the artwork itself, for anyone who cannot see it. */
/**
 * Alternative text for the full lockup.
 *
 * A function of the live business name rather than a module constant, so
 * renaming the business in the console renames it in the alt text too.
 */
function lockupAlt(name: string): string {
  return `${name} logo: a gable roof outline around a house, with "Second Chance" arced along the sides`;
}

export type LogoTone = 'onLight' | 'onDark';

interface LogoMarkProps {
  /** Rendered height in pixels. Width follows the artwork's own ratio. */
  size?: number;
  tone?: LogoTone;
  className?: string;
  /** Purely decorative — a sibling element already names the business. */
  decorative?: boolean;
}

/**
 * The house glyph alone. For tight spaces where the full lockup would be
 * illegible: the admin bar, the 404 page, compact chrome.
 */
export function LogoMark({ size = 34, tone = 'onLight', className, decorative = true }: LogoMarkProps) {
  const { site } = useSiteContent();
  const width = Math.round((size * MARK.width) / MARK.height);
  return (
    <span className={cn(styles.plate, tone === 'onDark' && styles.plateOnDark, className)}>
      <img
        className={styles.art}
        src={MARK.src}
        width={width}
        height={size}
        alt={decorative ? '' : `${site.legalName} house mark`}
        aria-hidden={decorative || undefined}
        draggable={false}
        loading="eager"
        decoding="sync"
      />
    </span>
  );
}

interface LogoProps {
  /**
   * `lockup` is the supplied artwork on its own — it already contains the
   * business name. `withWordmark` sets the artwork beside typeset text, for
   * places where the full legal name should be selectable and searchable.
   */
  variant?: 'lockup' | 'withWordmark' | 'stacked';
  tone?: LogoTone;
  /** Rendered height of the artwork in pixels. */
  size?: number;
  className?: string;
}

export function Logo({ variant = 'lockup', tone = 'onLight', size = 46, className }: LogoProps) {
  const { site } = useSiteContent();
  const width = Math.round((size * LOCKUP.width) / LOCKUP.height);

  const art = (
    <span className={cn(styles.plate, tone === 'onDark' && styles.plateOnDark)}>
      <img
        className={styles.art}
        src={LOCKUP.src}
        width={width}
        height={size}
        // The lockup contains the business name, so it is the accessible name
        // for the link that wraps it. Never empty here.
        alt={variant === 'lockup' ? lockupAlt(site.legalName) : ''}
        aria-hidden={variant === 'lockup' ? undefined : true}
        draggable={false}
        loading="eager"
        decoding="sync"
      />
    </span>
  );

  if (variant === 'lockup') {
    return <span className={cn(styles.logo, className)}>{art}</span>;
  }

  return (
    <span className={cn(styles.logo, styles[variant], className)}>
      {art}
      <span className={styles.wordmarkGroup}>
        <span className={styles.wordmark}>
          <span className={styles.name}>Kellum&rsquo;s</span>
          <span className={styles.suffix}>Second Chance Renovations</span>
        </span>
        {variant === 'stacked' ? <span className={styles.tagline}>{site.tagline}</span> : null}
      </span>
    </span>
  );
}
