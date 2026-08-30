import { Quote } from 'lucide-react';
import styles from './TestimonialCard.module.css';
import { StarRating } from '@/components/ui/StarRating';
import { formatMonthYear, reviewerName } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { Testimonial } from '@/lib/api/types';

interface TestimonialCardProps {
  testimonial: Testimonial;
  variant?: 'default' | 'feature';
  index?: number;
  className?: string;
}

export function TestimonialCard({
  testimonial,
  variant = 'default',
  index = 0,
  className,
}: TestimonialCardProps) {
  const date = formatMonthYear(testimonial.reviewedOn);

  return (
    <figure
      className={cn(styles.card, styles[variant], className)}
      data-reveal
      style={{ ['--reveal-delay' as string]: `${Math.min(index, 4) * 80}ms` }}
    >
      <Quote className={styles.mark} size={variant === 'feature' ? 34 : 26} strokeWidth={1.2} aria-hidden="true" />

      <div className={styles.head}>
        <StarRating value={testimonial.rating} hideLabel={false} size={15} />
        {testimonial.isSampleContent ? (
          <span className={styles.sampleTag}>Example</span>
        ) : null}
      </div>

      <blockquote className={styles.quoteWrap}>
        <p className={styles.quote}>{testimonial.quote}</p>
      </blockquote>

      <figcaption className={styles.attribution}>
        <span className={styles.name}>
          {reviewerName(testimonial.firstName, testimonial.lastInitial)}
        </span>
        <span className={styles.details}>
          {[testimonial.location, testimonial.projectCategory, date].filter(Boolean).join(' · ')}
        </span>
      </figcaption>
    </figure>
  );
}
