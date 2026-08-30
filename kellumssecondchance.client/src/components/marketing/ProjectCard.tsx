import { Link } from 'react-router-dom';
import { ArrowUpRight, MapPin } from 'lucide-react';
import styles from './ProjectCard.module.css';
import { Photo } from '@/components/ui/Photo';
import { missingImage } from '@/content/media';
import { formatMonthYear } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { ProjectSummary } from '@/lib/api/types';

interface ProjectCardProps {
  project: ProjectSummary;
  /** `editorial` is the large homepage/gallery card; `tile` is the dense variant. */
  variant?: 'editorial' | 'tile';
  index?: number;
  className?: string;
  sizes?: string;
  /** Alternates the image side on wide screens for the editorial variant. */
  flip?: boolean;
  priority?: boolean;
}

export function ProjectCard({
  project,
  variant = 'tile',
  index = 0,
  className,
  sizes = '(min-width: 68rem) 32vw, (min-width: 40rem) 46vw, 92vw',
  flip = false,
  priority = false,
}: ProjectCardProps) {
  const image = project.coverImage ?? missingImage;
  const completed = formatMonthYear(project.completedOn);

  return (
    <article
      className={cn(styles.card, styles[variant], flip && styles.flip, className)}
      data-photo-zoom
      data-reveal
      style={{ ['--reveal-delay' as string]: `${Math.min(index, 4) * 80}ms` }}
    >
      <div className={styles.media}>
        <Photo
          image={image}
          ratio="landscape"
          zoomOnHover
          sizes={sizes}
          priority={priority}
          scrim={variant === 'tile' ? 'bottom' : 'none'}
        />
        {project.hasBeforeAfter ? (
          <span className={styles.pairBadge}>
            <span className={styles.pairBefore}>Before</span>
            <span className={styles.pairSeam} aria-hidden="true" />
            <span className={styles.pairAfter}>After</span>
          </span>
        ) : null}
        <span className={styles.mediaTick} aria-hidden="true" />
      </div>

      <div className={styles.body}>
        <p className={styles.meta}>
          <span className={styles.category}>{project.category}</span>
          {project.location ? (
            <span className={styles.location}>
              <MapPin size={12} strokeWidth={2} aria-hidden="true" />
              {project.location}
            </span>
          ) : null}
          {completed ? <span className={styles.date}>{completed}</span> : null}
        </p>

        <h3 className={styles.title}>
          <Link to={`/projects/${project.slug}`} className={styles.link}>
            {project.title}
          </Link>
        </h3>

        <p className={styles.summary}>{project.summary}</p>

        <span className={styles.more} aria-hidden="true">
          Read the case study
          <ArrowUpRight size={15} strokeWidth={2} />
        </span>
      </div>
    </article>
  );
}
