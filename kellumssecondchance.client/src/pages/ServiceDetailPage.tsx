import { useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ArrowUpRight, Check } from 'lucide-react';
import styles from './ServiceDetailPage.module.css';
import { Seo } from '@/lib/seo/Seo';
import { breadcrumbSchema, graph, organizationSchema, serviceSchema } from '@/lib/seo/structuredData';
import { PageHero } from '@/components/marketing/PageHero';
import { ProjectCard } from '@/components/marketing/ProjectCard';
import { CtaSection } from '@/components/marketing/CtaSection';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { SampleContentNotice } from '@/components/ui/SampleContentNotice';
import { useAsync } from '@/lib/hooks/useAsync';
import { getProjects, getService } from '@/lib/api/endpoints';
import { useSiteContent } from '@/lib/siteContentContext';
import { ApiError } from '@/lib/api/client';
import NotFoundPage from './NotFoundPage';

export default function ServiceDetailPage() {
  const { site } = useSiteContent();
  const { slug = '' } = useParams();

  const serviceLoader = useCallback((signal: AbortSignal) => getService(slug, signal), [slug]);
  const { data: service, status, error, reload, isLoading } = useAsync(serviceLoader);

  const projectsLoader = useCallback((signal: AbortSignal) => getProjects({}, signal), []);
  const projects = useAsync(projectsLoader);

  const related = useMemo(() => {
    if (!service) return [];
    const all = projects.data ?? [];
    const bySlug = all.filter((p) => service.relatedProjectSlugs.includes(p.slug));
    return (bySlug.length > 0 ? bySlug : all.filter((p) => p.categorySlug === service.slug)).slice(0, 3);
  }, [service, projects.data]);

  if (status === 'error' && error instanceof ApiError && error.status === 404) {
    return <NotFoundPage />;
  }

  if (isLoading) {
    return (
      <Container className={styles.loading}>
        <LoadingState label="Loading this service" variant="detail" count={1} />
      </Container>
    );
  }

  if (status === 'error' || !service) {
    return (
      <Container className={styles.loading}>
        <ErrorState
          title="We could not load this service"
          description="Something went wrong on our end. It is usually temporary."
          onRetry={reload}
        />
      </Container>
    );
  }

  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'Services', path: '/services' },
    { name: service.name, path: `/services/${service.slug}` },
  ];

  const structuredData = graph(
    organizationSchema(site),
    breadcrumbSchema(site, crumbs),
    serviceSchema(site, service),
  );

  return (
    <>
      <Seo
        title={service.metaTitle ?? service.name}
        description={service.metaDescription ?? service.summary}
        path={`/services/${service.slug}`}
        image={service.image?.src}
        imageAlt={service.image?.alt}
        structuredData={structuredData}
      />

      <PageHero
        eyebrow={service.tagline}
        title={service.headline}
        lead={service.summary}
        crumbs={crumbs}
        image={service.image}
        layout="panel"
        actions={
          <Button as="link" to="/request-estimate" iconRight={<ArrowUpRight size={17} />}>
            Get an estimate for this
          </Button>
        }
      />

      <section className={styles.body} aria-labelledby="service-body-heading">
        <Container width="wide">
          <div className={styles.layout}>
            <div className={styles.main}>
              <h2 id="service-body-heading" className="u-visually-hidden">
                About {service.name}
              </h2>
              <p className={styles.intro} data-reveal>
                {service.introduction}
              </p>

              <div className={styles.block} data-reveal>
                <Eyebrow index="01">What this covers</Eyebrow>
                <ul className={styles.checkList}>
                  {service.includes.map((item) => (
                    <li key={item}>
                      <Check size={16} strokeWidth={2.2} aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {service.bestFor.length > 0 ? (
                <div className={styles.block} data-reveal>
                  <Eyebrow index="02">Best suited to</Eyebrow>
                  <ul className={styles.checkList}>
                    {service.bestFor.map((item) => (
                      <li key={item}>
                        <Check size={16} strokeWidth={2.2} aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {service.considerations.length > 0 ? (
                <div className={styles.block} data-reveal>
                  <Eyebrow index="03">Worth knowing up front</Eyebrow>
                  <ul className={styles.noteList}>
                    {service.considerations.map((item) => (
                      <li key={item}>
                        <AlertTriangle size={15} strokeWidth={2} aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className={styles.honestNote}>
                    We put this here on purpose. Knowing the awkward parts before you commit is worth
                    more than a page that only tells you the good bits.
                  </p>
                </div>
              ) : null}
            </div>

            <aside className={styles.aside} aria-label="Next steps">
              <div className={styles.panel}>
                <h3 className={styles.panelTitle}>Start here</h3>
                <p className={styles.panelText}>
                  Send us your house and what is bothering you about its exterior. Four short steps, and a real
                  person reads it.
                </p>
                <Button as="link" to="/request-estimate" fullWidth>
                  Request an estimate
                </Button>
                <Button as="link" to="/contact" variant="secondary" fullWidth>
                  Ask a question first
                </Button>
              </div>

              <div className={styles.panelPlain}>
                <h3 className={styles.panelTitle}>Related reading</h3>
                <ul className={styles.linkList}>
                  <li>
                    <Button as="link" to="/faq" variant="link" iconRight={<ArrowUpRight size={14} />}>
                      Common questions
                    </Button>
                  </li>
                  <li>
                    <Button as="link" to="/projects" variant="link" iconRight={<ArrowUpRight size={14} />}>
                      All project case studies
                    </Button>
                  </li>
                  <li>
                    <Button as="link" to="/service-area" variant="link" iconRight={<ArrowUpRight size={14} />}>
                      Where we work
                    </Button>
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        </Container>
      </section>

      {related.length > 0 ? (
        <section className={styles.related} aria-labelledby="related-heading">
          <Container width="wide">
            <Eyebrow>Related work</Eyebrow>
            <h2 id="related-heading" className={styles.relatedTitle}>
              Projects like this
            </h2>
            {related.some((p) => p.isSampleContent) ? (
              <SampleContentNotice context="projects" className={styles.relatedNotice} />
            ) : null}
            <ul className={styles.relatedGrid}>
              {related.map((project, index) => (
                <li key={project.slug}>
                  <ProjectCard project={project} variant="tile" index={index} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}

      <div className={styles.backBar}>
        <Container width="wide">
          <Button as="link" to="/services" variant="link" iconLeft={<ArrowLeft size={16} />}>
            All services
          </Button>
        </Container>
      </div>

      <CtaSection />
    </>
  );
}
