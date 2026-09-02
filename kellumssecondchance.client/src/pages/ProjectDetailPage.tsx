import { useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Check } from 'lucide-react';
import styles from './ProjectDetailPage.module.css';
import { Seo } from '@/lib/seo/Seo';
import { breadcrumbSchema, graph, organizationSchema, projectSchema } from '@/lib/seo/structuredData';
import { PageHero } from '@/components/marketing/PageHero';
import { BeforeAfterSlider } from '@/components/marketing/BeforeAfterSlider';
import { CtaSection } from '@/components/marketing/CtaSection';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Photo } from '@/components/ui/Photo';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { SampleContentNotice } from '@/components/ui/SampleContentNotice';
import { ApiError } from '@/lib/api/client';
import { useAsync } from '@/lib/hooks/useAsync';
import { getProject } from '@/lib/api/endpoints';
import { useSiteContent } from '@/lib/siteContentContext';
import { formatMonthYear } from '@/lib/format';
import NotFoundPage from './NotFoundPage';
import type { BeforeAfterPair, ProjectDetail } from '@/lib/api/types';

function pairImages(project: ProjectDetail): BeforeAfterPair[] {
  const befores = project.images.filter((i) => i.kind === 'Before');
  const afters = project.images.filter((i) => i.kind === 'After');
  const pairs: BeforeAfterPair[] = [];

  for (const before of befores) {
    const after =
      afters.find((a) => a.pairKey && a.pairKey === before.pairKey) ??
      (befores.length === 1 && afters.length === 1 ? afters[0] : undefined);
    if (!after) continue;
    pairs.push({
      key: before.pairKey ?? `pair-${before.id}`,
      label: before.caption ?? project.title,
      before,
      after,
    });
  }
  return pairs;
}

export default function ProjectDetailPage() {
  const { slug = '' } = useParams();
  const { site } = useSiteContent();
  const loader = useCallback((signal: AbortSignal) => getProject(slug, signal), [slug]);
  const { data: project, status, error, reload, isLoading } = useAsync(loader);

  const pairs = useMemo(() => (project ? pairImages(project) : []), [project]);
  const gallery = useMemo(
    () => (project ? project.images.filter((i) => i.kind === 'Gallery') : []),
    [project],
  );

  const crumbs = useMemo(
    () => [
      { name: 'Home', path: '/' },
      { name: 'Projects', path: '/projects' },
      ...(project ? [{ name: project.title, path: `/projects/${project.slug}` }] : []),
    ],
    [project],
  );

  const structuredData = useMemo(
    () =>
      project
        ? graph(organizationSchema(site), breadcrumbSchema(site, crumbs), projectSchema(site, project))
        : [],
    [site, crumbs, project],
  );

  if (status === 'error' && error instanceof ApiError && error.status === 404) {
    return <NotFoundPage />;
  }

  if (isLoading) {
    return (
      <Container className={styles.loading}>
        <LoadingState label="Loading this project" variant="detail" count={1} />
      </Container>
    );
  }

  if (status === 'error' || !project) {
    return (
      <Container className={styles.loading}>
        <ErrorState
          title="We could not load this project"
          description="Something went wrong fetching this case study. It is usually temporary."
          onRetry={reload}
        />
      </Container>
    );
  }

  const completed = formatMonthYear(project.completedOn);

  return (
    <>
      <Seo
        title={project.metaTitle ?? project.title}
        description={project.metaDescription ?? project.summary}
        path={`/projects/${project.slug}`}
        image={project.coverImage?.src}
        imageAlt={project.coverImage?.alt}
        type="article"
        structuredData={structuredData}
      />

      <PageHero
        eyebrow={project.category}
        title={project.title}
        lead={project.summary}
        crumbs={crumbs}
        image={project.coverImage}
        layout="banner"
        meta={
          <dl className={styles.heroMeta}>
            {project.location ? (
              <div>
                <dt>Location</dt>
                <dd>{project.location}</dd>
              </div>
            ) : null}
            {completed ? (
              <div>
                <dt>Completed</dt>
                <dd>{completed}</dd>
              </div>
            ) : null}
            {project.durationLabel ? (
              <div>
                <dt>Duration</dt>
                <dd>{project.durationLabel}</dd>
              </div>
            ) : null}
            {project.propertyType ? (
              <div>
                <dt>Property</dt>
                <dd>{project.propertyType}</dd>
              </div>
            ) : null}
          </dl>
        }
        actions={
          <Button as="link" to="/request-estimate" iconRight={<ArrowUpRight size={17} />}>
            Start a project like this
          </Button>
        }
      />

      {/* ---- The story --------------------------------------------------- */}
      <section className={styles.story} aria-labelledby="story-heading">
        <Container width="wide">
          {project.isSampleContent ? (
            <SampleContentNotice context="projects" className={styles.notice} />
          ) : null}

          <div className={styles.storyGrid}>
            <div className={styles.storyMain}>
              <h2 id="story-heading" className="u-visually-hidden">
                Project story
              </h2>

              <article className={styles.chapter} data-reveal>
                <Eyebrow index="01">The challenge</Eyebrow>
                <p className={styles.chapterBody}>{project.challenge}</p>
              </article>

              <article className={styles.chapter} data-reveal>
                <Eyebrow index="02">The vision</Eyebrow>
                <p className={styles.chapterBody}>{project.vision}</p>
              </article>

              <article className={styles.chapter} data-reveal>
                <Eyebrow index="03">The transformation</Eyebrow>
                <p className={styles.chapterBody}>{project.transformation}</p>
              </article>

              {project.outcome ? (
                <article className={styles.chapter} data-reveal>
                  <Eyebrow index="04">The result</Eyebrow>
                  <p className={styles.chapterBody}>{project.outcome}</p>
                </article>
              ) : null}
            </div>

            <aside className={styles.sidebar} aria-label="Project details">
              {project.highlights.length > 0 ? (
                <div className={styles.panel}>
                  <h3 className={styles.panelTitle}>What the job involved</h3>
                  <ul className={styles.highlights}>
                    {project.highlights.map((highlight) => (
                      <li key={highlight}>
                        <Check size={15} strokeWidth={2.2} aria-hidden="true" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {project.serviceSlugs.length > 0 ? (
                <div className={styles.panel}>
                  <h3 className={styles.panelTitle}>Services performed</h3>
                  <ul className={styles.services}>
                    {project.serviceSlugs.map((serviceSlug, index) => (
                      <li key={serviceSlug}>
                        <Link to={`/services/${serviceSlug}`} className={styles.serviceLink}>
                          {project.serviceNames[index] ?? serviceSlug}
                          <ArrowUpRight size={13} strokeWidth={2} aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className={styles.panelCta} data-theme="dark">
                <p className={styles.panelCtaText}>
                  Got an exterior project like this one? Tell us about it — the first conversation costs nothing.
                </p>
                <Button as="link" to="/request-estimate" fullWidth>
                  Request an estimate
                </Button>
              </div>
            </aside>
          </div>
        </Container>
      </section>

      {/* ---- Before & After ---------------------------------------------- */}
      {pairs.length > 0 ? (
        <section className={styles.comparison} data-theme="dark" aria-labelledby="comparison-heading">
          <Container width="default">
            <Eyebrow className={styles.comparisonEyebrow}>Before &amp; after</Eyebrow>
            <h2 id="comparison-heading" className={styles.comparisonTitle} data-reveal>
              Drag the seam.
            </h2>

            <div className={styles.comparisonList}>
              {pairs.map((pair) => (
                <figure className={styles.comparisonItem} key={pair.key}>
                  <BeforeAfterSlider
                    before={pair.before}
                    after={pair.after}
                    label={pair.label}
                    ratio="landscape"
                    sizes="(min-width: 68rem) 66vw, 92vw"
                  />
                  {pair.before.caption || pair.after.caption ? (
                    <figcaption className={styles.comparisonCaption}>
                      <span className={styles.comparisonCaptionSide}>
                        <strong>Before</strong> {pair.before.caption}
                      </span>
                      <span className={styles.comparisonCaptionSide}>
                        <strong>After</strong> {pair.after.caption}
                      </span>
                    </figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      {/* ---- Gallery ------------------------------------------------------ */}
      {gallery.length > 0 ? (
        <section className={styles.gallery} aria-labelledby="gallery-heading">
          <Container width="wide">
            <Eyebrow>Gallery</Eyebrow>
            <h2 id="gallery-heading" className={styles.galleryTitle}>
              More from this project
            </h2>
            <ul className={styles.galleryGrid}>
              {gallery.map((image, index) => (
                <li key={image.id} className={styles.galleryItem} data-photo-zoom data-reveal>
                  <Photo
                    image={image}
                    ratio={image.height > image.width ? 'portrait' : 'landscape'}
                    zoomOnHover
                    sizes="(min-width: 68rem) 32vw, (min-width: 44rem) 46vw, 92vw"
                    style={{ ['--reveal-delay' as string]: `${index * 70}ms` }}
                  />
                  {image.caption ? <p className={styles.galleryCaption}>{image.caption}</p> : null}
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}

      <div className={styles.backBar}>
        <Container width="wide">
          <Button as="link" to="/projects" variant="link" iconLeft={<ArrowLeft size={16} />}>
            All projects
          </Button>
        </Container>
      </div>

      <CtaSection
        eyebrow="Your turn"
        title="What part of your home deserves a second chance?"
      />
    </>
  );
}
