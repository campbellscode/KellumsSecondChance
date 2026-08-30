import type { ReactNode } from 'react';
import styles from './PageHero.module.css';
import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Photo } from '@/components/ui/Photo';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { cn } from '@/lib/cn';
import type { ImageAsset } from '@/lib/api/types';
import type { Crumb } from '@/lib/seo/structuredData';

interface PageHeroProps {
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  crumbs?: readonly Crumb[];
  image?: ImageAsset | null;
  /** `panel` keeps the artwork beside the copy; `banner` runs it behind. */
  layout?: 'panel' | 'banner' | 'plain';
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
}

/** Shared hero for every inner page. Keeps rhythm and tone consistent. */
export function PageHero({
  eyebrow,
  title,
  lead,
  crumbs,
  image,
  layout = 'panel',
  actions,
  meta,
  className,
}: PageHeroProps) {
  const showImage = layout !== 'plain' && image;

  return (
    <section
      className={cn(styles.hero, styles[layout], className)}
      data-theme="dark"
      aria-labelledby="page-hero-heading"
    >
      {layout === 'banner' && image ? (
        <>
          <Photo image={image} className={styles.bannerFrame} imgClassName={styles.bannerImg} sizes="100vw" priority />
          <span className={styles.veil} aria-hidden="true" />
        </>
      ) : null}
      <span className={styles.grid} aria-hidden="true" />

      <Container width="wide" className={styles.inner}>
        <div className={styles.copy}>
          {crumbs && crumbs.length > 0 ? <Breadcrumbs items={crumbs} className={styles.crumbs} /> : null}
          <Eyebrow className={styles.eyebrow}>{eyebrow}</Eyebrow>
          <h1 id="page-hero-heading" className={styles.title}>
            {title}
          </h1>
          {lead ? <p className={styles.lead}>{lead}</p> : null}
          {meta ? <div className={styles.meta}>{meta}</div> : null}
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </div>

        {layout === 'panel' && showImage && image ? (
          <div className={styles.panelMedia} data-photo-zoom>
            <Photo image={image} ratio="landscape" sizes="(min-width: 68rem) 42vw, 92vw" priority zoomOnHover />
            <span className={styles.panelTick} aria-hidden="true" />
          </div>
        ) : null}
      </Container>
    </section>
  );
}
