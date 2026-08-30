import type { ReactNode } from 'react';
import styles from './SectionHeading.module.css';
import { Eyebrow } from './Eyebrow';
import { cn } from '@/lib/cn';

interface SectionHeadingProps {
  eyebrow?: ReactNode;
  eyebrowIndex?: string;
  title: ReactNode;
  lead?: ReactNode;
  /** Heading level. Defaults to h2 — only the page hero should use h1. */
  level?: 1 | 2 | 3;
  align?: 'start' | 'center';
  /** Renders alongside the heading on wide screens (usually a CTA). */
  action?: ReactNode;
  className?: string;
  id?: string;
  size?: 'md' | 'lg' | 'xl';
}

export function SectionHeading({
  eyebrow,
  eyebrowIndex,
  title,
  lead,
  level = 2,
  align = 'start',
  action,
  className,
  id,
  size = 'lg',
}: SectionHeadingProps) {
  const Tag = `h${level}` as const;
  return (
    <div className={cn(styles.wrap, styles[align], action && styles.hasAction, className)}>
      <div className={styles.main}>
        {eyebrow ? (
          <Eyebrow index={eyebrowIndex} className={styles.eyebrow}>
            {eyebrow}
          </Eyebrow>
        ) : null}
        <Tag id={id} className={cn('u-display', styles.title, styles[`size-${size}`])} data-reveal>
          {title}
        </Tag>
        {lead ? <p className={cn('u-lead', styles.lead)}>{lead}</p> : null}
      </div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
