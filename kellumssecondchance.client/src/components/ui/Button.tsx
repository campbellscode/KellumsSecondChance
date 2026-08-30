import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import styles from './Button.module.css';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'link' | 'inverse';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface CommonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  /** Icon rendered after the label. Arrow-style icons animate on hover. */
  iconRight?: ReactNode;
  iconLeft?: ReactNode;
  fullWidth?: boolean;
}

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    as?: 'button';
    loading?: boolean;
    loadingLabel?: string;
  };

type ButtonAsLink = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children' | 'href'> & {
    as: 'a';
    href: string;
  };

type ButtonAsRouterLink = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children' | 'href'> & {
    as: 'link';
    to: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink | ButtonAsRouterLink;

/**
 * The one button in the system.
 *
 * Renders as <button>, <a> or a router <Link> without ever producing a nested or
 * role-faked control, so keyboard and screen-reader behaviour stays native.
 */
export function Button(props: ButtonProps) {
  const {
    children,
    variant = 'primary',
    size = 'md',
    className,
    iconRight,
    iconLeft,
    fullWidth,
  } = props;

  const classes = cn(
    styles.button,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    className,
  );

  const inner = (
    <>
      <span className={styles.shine} aria-hidden="true" />
      {iconLeft ? (
        <span className={styles.iconLeft} aria-hidden="true">
          {iconLeft}
        </span>
      ) : null}
      <span className={styles.label}>{children}</span>
      {iconRight ? (
        <span className={styles.iconRight} aria-hidden="true">
          {iconRight}
        </span>
      ) : null}
    </>
  );

  if (props.as === 'link') {
    const { as: _as, to, variant: _v, size: _s, className: _c, iconRight: _ir, iconLeft: _il, fullWidth: _fw, children: _ch, ...rest } = props;
    return (
      <Link to={to} className={classes} {...rest}>
        {inner}
      </Link>
    );
  }

  if (props.as === 'a') {
    const { as: _as, variant: _v, size: _s, className: _c, iconRight: _ir, iconLeft: _il, fullWidth: _fw, children: _ch, ...rest } = props;
    return (
      <a className={classes} {...rest}>
        {inner}
      </a>
    );
  }

  const {
    as: _as,
    loading = false,
    loadingLabel = 'Working…',
    variant: _v,
    size: _s,
    className: _c,
    iconRight: _ir,
    iconLeft: _il,
    fullWidth: _fw,
    children: _ch,
    type = 'button',
    disabled,
    ...rest
  } = props;

  return (
    <button
      type={type}
      className={cn(classes, loading && styles.isLoading)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      <span className={styles.shine} aria-hidden="true" />
      {loading ? (
        <>
          <Loader2 className={styles.spinner} size={17} aria-hidden="true" />
          <span className={styles.label}>{loadingLabel}</span>
        </>
      ) : (
        <>
          {iconLeft ? (
            <span className={styles.iconLeft} aria-hidden="true">
              {iconLeft}
            </span>
          ) : null}
          <span className={styles.label}>{children}</span>
          {iconRight ? (
            <span className={styles.iconRight} aria-hidden="true">
              {iconRight}
            </span>
          ) : null}
        </>
      )}
    </button>
  );
}
