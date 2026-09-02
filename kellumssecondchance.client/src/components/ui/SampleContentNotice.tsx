import { Info } from 'lucide-react';
import styles from './SampleContentNotice.module.css';
import { cn } from '@/lib/cn';

/**
 * Honest labelling for content that is not yet real.
 *
 * The site refuses to pass off written examples as finished jobs or genuine
 * customer statements — but a homeowner should never have to read the words
 * "sample content", "seed data" or "placeholder" to learn that. Each context
 * below says the true thing in plain English, in the brand's voice.
 *
 * Every one of these disappears on its own as real records replace the examples.
 */
export type SampleContentContext = 'projects' | 'comparisons' | 'reviews' | 'serviceAreas';

const COPY: Record<SampleContentContext, { label: string; body: string }> = {
  projects: {
    label: 'Example write-ups',
    body:
      'Our own project photography and stories are being put together right now. Until they are ready, these show how a finished Kellum’s write-up reads — they are not records of completed jobs.',
  },
  comparisons: {
    label: 'Example transformations',
    body:
      'Shown for illustration. These are not photographs of completed Kellum’s projects — the real ones are on the way.',
  },
  reviews: {
    label: 'No reviews published yet',
    body:
      'We have not published customer reviews yet. These show what will appear here once homeowners have had their say — we would rather admit that than write our own and call them real.',
  },
  serviceAreas: {
    label: 'Coverage being confirmed',
    body:
      'We are still finalising the areas we publish here. Send us your ZIP code with your project and we will tell you straight away whether we can get to you.',
  },
};

interface SampleContentNoticeProps {
  context: SampleContentContext;
  className?: string;
  tone?: 'inline' | 'block';
}

export function SampleContentNotice({ context, className, tone = 'block' }: SampleContentNoticeProps) {
  const { label, body } = COPY[context];

  return (
    <p className={cn(styles.notice, styles[tone], className)}>
      <Info size={15} strokeWidth={1.8} aria-hidden="true" className={styles.icon} />
      <span>
        <strong className={styles.strong}>{label}.</strong> {body}
      </span>
    </p>
  );
}
