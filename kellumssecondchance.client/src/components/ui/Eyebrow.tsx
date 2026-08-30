import type { ReactNode } from 'react';
import styles from './Eyebrow.module.css';
import { cn } from '@/lib/cn';

interface EyebrowProps {
  children: ReactNode;
  /** Two-digit index rendered as a drafting annotation, e.g. "03". */
  index?: string;
  className?: string;
  as?: 'p' | 'span' | 'div';
}

/** Mono, letter-spaced micro-label. The site's drafting-annotation voice. */
export function Eyebrow({ children, index, className, as: Tag = 'p' }: EyebrowProps) {
  return (
    <Tag className={cn(styles.eyebrow, className)}>
      {index ? <span className={styles.index}>{index}</span> : null}
      <span className={styles.rule} aria-hidden="true" />
      <span className={styles.text}>{children}</span>
    </Tag>
  );
}
