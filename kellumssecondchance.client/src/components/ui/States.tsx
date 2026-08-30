import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw, SearchX } from 'lucide-react';
import styles from './States.module.css';
import { Button } from './Button';
import { cn } from '@/lib/cn';

/* ------------------------------------------------------------- skeletons */

interface SkeletonProps {
  className?: string;
  /** CSS aspect-ratio, e.g. "3 / 2". */
  ratio?: string;
  height?: string;
  rounded?: boolean;
}

export function Skeleton({ className, ratio, height, rounded }: SkeletonProps) {
  return (
    <span
      className={cn(styles.skeleton, rounded && styles.skeletonRounded, className)}
      style={{ aspectRatio: ratio, height }}
      aria-hidden="true"
    />
  );
}

interface LoadingStateProps {
  /** Announced to assistive tech while content loads. */
  label: string;
  variant?: 'cards' | 'list' | 'detail' | 'inline';
  count?: number;
  className?: string;
}

/**
 * Shape-matched loading placeholder.
 *
 * Skeletons mirror the layout that will replace them, so nothing jumps when the
 * data arrives. The status text is visually hidden but announced politely.
 */
export function LoadingState({ label, variant = 'cards', count = 3, className }: LoadingStateProps) {
  if (variant === 'inline') {
    return (
      <p className={cn(styles.inline, className)} role="status">
        <RefreshCw size={16} className={styles.inlineSpinner} aria-hidden="true" />
        <span>{label}</span>
      </p>
    );
  }

  return (
    <div className={cn(styles.loading, styles[variant], className)} role="status" aria-live="polite">
      <span className="u-visually-hidden">{label}</span>
      {Array.from({ length: count }, (_, i) => (
        <div className={styles.loadingItem} key={i}>
          <Skeleton ratio={variant === 'list' ? undefined : '3 / 2'} height={variant === 'list' ? '1.25rem' : undefined} />
          {variant !== 'list' ? (
            <>
              <Skeleton height="0.75rem" className={styles.line} />
              <Skeleton height="1.35rem" className={styles.lineWide} />
              <Skeleton height="0.9rem" className={styles.lineShort} />
            </>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------- empty */

interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div className={cn(styles.state, className)}>
      <span className={styles.stateIcon} aria-hidden="true">
        {icon ?? <SearchX size={22} strokeWidth={1.6} />}
      </span>
      <h3 className={cn('u-display', styles.stateTitle)}>{title}</h3>
      {description ? <p className={styles.stateText}>{description}</p> : null}
      {action ? <div className={styles.stateAction}>{action}</div> : null}
    </div>
  );
}

/* ----------------------------------------------------------------- error */

interface ErrorStateProps {
  title?: string;
  description?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/**
 * The failure state. Deliberately does not print the raw exception — visitors
 * get a plain explanation and a way forward, never a stack trace or a status code.
 */
export function ErrorState({
  title = 'That did not load',
  description = 'Something went wrong on our end while fetching this. It is usually temporary.',
  onRetry,
  retryLabel = 'Try again',
  className,
}: ErrorStateProps) {
  return (
    <div className={cn(styles.state, styles.error, className)} role="alert">
      <span className={styles.stateIcon} aria-hidden="true">
        <AlertTriangle size={22} strokeWidth={1.6} />
      </span>
      <h3 className={cn('u-display', styles.stateTitle)}>{title}</h3>
      <p className={styles.stateText}>{description}</p>
      {onRetry ? (
        <div className={styles.stateAction}>
          <Button variant="secondary" size="sm" onClick={onRetry} iconLeft={<RefreshCw size={15} />}>
            {retryLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
