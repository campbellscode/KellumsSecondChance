import type { ReactNode } from 'react';
import styles from './Eyebrow.module.css';
import { Roofline } from '@/components/brand/Roofline';
import { cn } from '@/lib/cn';

interface EyebrowProps {
  children: ReactNode;
  /** Two-digit index rendered as a drafting annotation, e.g. "03". */
  index?: string;
  className?: string;
  as?: 'p' | 'span' | 'div';
}

/**
 * Mono, letter-spaced micro-label with the brand's gable tick — the same roof
 * pitch as the logo, so section markers read as Kellum’s rather than generic.
 */
export function Eyebrow({ children, index, className, as: Tag = 'p' }: EyebrowProps) {
  return (
    <Tag className={cn(styles.eyebrow, className)}>
      {index ? <span className={styles.index}>{index}</span> : null}
      <Roofline variant="tick" className={styles.tick} />
      <span className={styles.text}>{children}</span>
    </Tag>
  );
}
