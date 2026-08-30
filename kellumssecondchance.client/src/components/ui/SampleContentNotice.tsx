import { Info } from 'lucide-react';
import styles from './SampleContentNotice.module.css';
import { cn } from '@/lib/cn';

interface SampleContentNoticeProps {
  /** What is being labelled, e.g. "reviews" or "projects". */
  what: string;
  className?: string;
  tone?: 'inline' | 'block';
}

/**
 * Honest labelling for seeded demonstration content.
 *
 * Rendered wherever `isSampleContent` records are displayed so a placeholder is
 * never mistaken for a real customer statement, a completed job or a confirmed
 * service area. It disappears on its own once real records replace the samples.
 */
export function SampleContentNotice({ what, className, tone = 'block' }: SampleContentNoticeProps) {
  return (
    <p className={cn(styles.notice, styles[tone], className)}>
      <Info size={15} strokeWidth={1.8} aria-hidden="true" className={styles.icon} />
      <span>
        <strong className={styles.strong}>Sample content.</strong>{' '}
        {`These ${what} are written examples used while the site is being set up — not real Kellum's records.`}
      </span>
    </p>
  );
}
