import { useCallback, useMemo } from 'react';
import { ArrowUpRight } from 'lucide-react';
import styles from './ServicesPage.module.css';
import { Seo } from '@/lib/seo/Seo';
import { breadcrumbSchema, graph, organizationSchema, serviceSchema } from '@/lib/seo/structuredData';
import { PageHero } from '@/components/marketing/PageHero';
import { ServiceCard } from '@/components/marketing/ServiceCard';
import { CtaSection } from '@/components/marketing/CtaSection';
import { ProcessSection } from '@/components/marketing/ProcessSection';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useAsync } from '@/lib/hooks/useAsync';
import { getServices } from '@/lib/api/endpoints';
import { editorialMedia } from '@/content/media';
import { useSiteContent } from '@/lib/siteContentContext';

const CRUMBS = [
  { name: 'Home', path: '/' },
  { name: 'Services', path: '/services' },
];

export default function ServicesPage() {
  const { site } = useSiteContent();
  const loader = useCallback((signal: AbortSignal) => getServices(signal), []);
  const services = useAsync(loader);

  const featured = (services.data ?? []).filter((s) => s.isFeatured);
  const rest = (services.data ?? []).filter((s) => !s.isFeatured);

  const structuredData = useMemo(
    () =>
      graph(
        organizationSchema(site),
        breadcrumbSchema(site, CRUMBS),
        ...(services.data ?? []).map((service) => serviceSchema(site, service)),
      ),
    [site, services.data],
  );

  return (
    <>
      <Seo
        title="Renovation & Remodeling Services"
        description="Roofing, siding, gutters, decks, exterior repairs and restoration services for homeowners in Cincinnati, Ohio."
        path="/services"
        structuredData={structuredData}
      />

      <PageHero
        eyebrow="What we take on"
        title="Home exteriors we bring back."
        lead="Some of this renews the whole exterior. Some of it fixes what somebody else got wrong. If it involves protecting or restoring the outside of your home, it is worth a conversation."
        crumbs={CRUMBS}
        image={editorialMedia.about}
        layout="banner"
        actions={
          <Button as="link" to="/request-estimate" iconRight={<ArrowUpRight size={17} />}>
            Request an estimate
          </Button>
        }
      />

      <section className={styles.overview} aria-labelledby="overview-heading">
        <Container width="wide">
          <div className={styles.overviewGrid}>
            <h2 id="overview-heading" className={styles.overviewTitle} data-reveal>
              One crew, one point of contact, the whole exterior finished.
            </h2>
            <div className={styles.overviewBody}>
              <p>
                Most renovation frustration comes from coordination — the tiler waiting on the
                plumber, the painter arriving before the drywall is sanded, and nobody willing to own
                the gap. We handle the sequence so you do not have to.
              </p>
              <p>
                For licensed trades — electrical, plumbing, structural — we bring in people who do
                that work every day and carry the right licence. We coordinate them and stay your
                single point of contact throughout.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className={styles.catalogue} aria-labelledby="catalogue-heading">
        <Container width="wide">
          <h2 id="catalogue-heading" className="u-visually-hidden">
            All services
          </h2>

          {services.isLoading ? (
            <LoadingState label="Loading our services" variant="cards" count={6} />
          ) : services.status === 'error' ? (
            <ErrorState
              title="Our service list is not loading"
              description="This is temporary. You can still send us your project and we will confirm whether it is something we take on."
              onRetry={services.reload}
            />
          ) : (services.data ?? []).length === 0 ? (
            <EmptyState
              title="Services are being updated"
              description="Our published service list is being refreshed. Get in touch and we will tell you straight away whether we can help."
              action={
                <Button as="link" to="/contact" size="sm">
                  Ask about your project
                </Button>
              }
            />
          ) : (
            <>
              {featured.length > 0 ? (
                <>
                  <p className={styles.groupLabel}>Most requested</p>
                  <ul className={styles.grid}>
                    {featured.map((service, index) => (
                      <li key={service.slug}>
                        <ServiceCard
                          service={service}
                          variant="feature"
                          index={index}
                          sizes="(min-width: 68rem) 31vw, (min-width: 44rem) 46vw, 92vw"
                        />
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              {rest.length > 0 ? (
                <>
                  <p className={styles.groupLabel}>Everything else we do</p>
                  <ul className={styles.grid}>
                    {rest.map((service, index) => (
                      <li key={service.slug}>
                        <ServiceCard service={service} variant="compact" index={index} />
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </>
          )}

          <div className={styles.notListed}>
            <div>
              <h2 className={styles.notListedTitle}>Not seeing what you need?</h2>
              <p className={styles.notListedBody}>
                This list is not exhaustive, and some of the best projects do not fit a category.
                Describe what you are trying to do and we will tell you honestly whether it is
                something we should take on.
              </p>
            </div>
            <Button as="link" to="/contact" variant="secondary" iconRight={<ArrowUpRight size={17} />}>
              Ask us about it
            </Button>
          </div>
        </Container>
      </section>

      <ProcessSection />
      <CtaSection />
    </>
  );
}
