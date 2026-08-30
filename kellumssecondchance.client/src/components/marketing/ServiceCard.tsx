import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import styles from './ServiceCard.module.css';
import { Photo } from '@/components/ui/Photo';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import type { ServiceSummary } from '@/lib/api/types';

interface ServiceCardProps {
  service: ServiceSummary;
  /** `feature` cards carry artwork; `compact` is text-only for dense grids. */
  variant?: 'feature' | 'compact';
  index?: number;
  className?: string;
  sizes?: string;
}

export function ServiceCard({
  service,
  variant = 'compact',
  index = 0,
  className,
  sizes = '(min-width: 68rem) 30vw, (min-width: 40rem) 46vw, 92vw',
}: ServiceCardProps) {
  const isFeature = variant === 'feature' && service.image !== null;

  return (
    <article
      className={cn(styles.card, isFeature ? styles.feature : styles.compact, className)}
      data-photo-zoom
      data-reveal
      style={{ ['--reveal-delay' as string]: `${Math.min(index, 5) * 70}ms` }}
    >
      {isFeature && service.image ? (
        <div className={styles.media}>
          <Photo image={service.image} ratio="landscape" zoomOnHover sizes={sizes} scrim="bottom" />
          <span className={styles.mediaTick} aria-hidden="true" />
        </div>
      ) : null}

      <div className={styles.body}>
        <span className={styles.icon}>
          <Icon name={service.icon} size={20} strokeWidth={1.5} />
        </span>

        <h3 className={styles.title}>
          {/* Stretched link: the whole card is clickable, one link in the a11y tree. */}
          <Link to={`/services/${service.slug}`} className={styles.link}>
            {service.name}
            <span className="u-visually-hidden"> — {service.tagline}</span>
          </Link>
        </h3>

        <p className={styles.tagline}>{service.tagline}</p>
        <p className={styles.summary}>{service.summary}</p>

        <span className={styles.more} aria-hidden="true">
          What this covers
          <ArrowUpRight size={15} strokeWidth={2} />
        </span>
      </div>
    </article>
  );
}
