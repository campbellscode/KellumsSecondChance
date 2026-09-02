import { useCallback, useMemo } from 'react';
import { ArrowUpRight, MapPin } from 'lucide-react';
import styles from './ServiceAreaPage.module.css';
import { Seo } from '@/lib/seo/Seo';
import { breadcrumbSchema, graph, organizationSchema } from '@/lib/seo/structuredData';
import { PageHero } from '@/components/marketing/PageHero';
import { CtaSection } from '@/components/marketing/CtaSection';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { SampleContentNotice } from '@/components/ui/SampleContentNotice';
import { useAsync } from '@/lib/hooks/useAsync';
import { getServiceAreas } from '@/lib/api/endpoints';
import { useSiteContent } from '@/lib/siteContentContext';
import { business } from '@/content/business';

const CRUMBS = [
  { name: 'Home', path: '/' },
  { name: 'Service Area', path: '/service-area' },
];

const CINCINNATI_MAP_URL =
  'https://www.google.com/maps?q=Cincinnati%2C%20OH&z=12&output=embed';


export default function ServiceAreaPage() {
  const loader = useCallback((signal: AbortSignal) => getServiceAreas(signal), []);
  const areas = useAsync(loader);
  const { content, site } = useSiteContent();
  const list = useMemo(() => areas.data ?? [], [areas.data]);
  const primary = list.filter((a) => a.isPrimary);
  const extended = list.filter((a) => !a.isPrimary);
  const primaryCity = primary.find((area) => area.kind === 'City');
  const counties = primary.filter((area) => area.kind === 'County');
  const structuredData = useMemo(
    () => graph(organizationSchema(site, list), breadcrumbSchema(site, CRUMBS)),
    [site, list],
  );
  const hasSample = list.some((a) => a.isSampleContent);

  return (
    <>
      <Seo
        title="Service Area"
        description="Kellum’s serves Cincinnati and approved nearby communities across Hamilton, Butler, Clermont and Warren counties in Ohio."
        path="/service-area"
        structuredData={structuredData}
      />

      <PageHero
        eyebrow="Where we work"
        title="Close enough to show up when we say we will."
        lead={content.serviceAreaSummary ?? business.serviceAreaSummary}
        crumbs={CRUMBS}
        panelContent={
          <div className={styles.mapFrame}>
            <iframe
              className={styles.map}
              src={CINCINNATI_MAP_URL}
              title="Google Map showing Cincinnati, Ohio service area"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        }
        layout="panel"
      />

      <section className={styles.section} aria-labelledby="area-heading">
        <Container width="wide">
          <h2 id="area-heading" className="u-visually-hidden">
            Our service area
          </h2>

          {hasSample ? <SampleContentNotice context="serviceAreas" className={styles.notice} /> : null}

          {areas.isLoading ? (
            <LoadingState label="Loading our service area" variant="list" count={4} />
          ) : areas.status === 'error' ? (
            <ErrorState
              title="Our service area is not loading"
              description="Please try again in a moment — or just ask us. We are happy to tell you over the phone."
              onRetry={areas.reload}
            />
          ) : list.length === 0 ? (
            <EmptyState
              title="Our published service area is being finalised"
              description="We have not published our coverage yet. Send us your ZIP code and we will tell you straight away whether we can get to you."
              icon={<MapPin size={22} strokeWidth={1.6} />}
              action={
                <Button as="link" to="/request-estimate" size="sm">
                  Check my address
                </Button>
              }
            />
          ) : (
            <div className={styles.layout}>
              <div className={styles.lists}>
                {primaryCity || counties.length > 0 ? (
                  <div className={styles.group}>
                    <h3 className={styles.groupTitle}>Core service area</h3>
                    <ul className={styles.areaList}>
                      {primaryCity ? (
                        <li className={styles.area} key={primaryCity.id}>
                          <span className={styles.areaHead}>
                            <MapPin size={16} strokeWidth={1.8} aria-hidden="true" />
                            <span className={styles.areaName}>{primaryCity.name}</span>
                            <Badge tone="outline">City</Badge>
                          </span>
                          <span className={styles.areaNote}>
                            {primaryCity.note ?? 'Our primary service area is Cincinnati, Ohio.'}
                          </span>
                        </li>
                      ) : null}
                      {counties.length > 0 ? (
                        <li className={styles.area}>
                          <span className={styles.areaHead}>
                            <MapPin size={16} strokeWidth={1.8} aria-hidden="true" />
                            <span className={styles.areaName}>Surrounding counties</span>
                            <Badge tone="outline">Counties</Badge>
                          </span>
                          <span className={styles.areaNames}>{counties.map((area) => area.name).join(' · ')}</span>
                          <span className={styles.areaNote}>
                            Serving homeowners across Hamilton, Butler, Clermont and Warren counties.
                          </span>
                        </li>
                      ) : null}
                    </ul>
                  </div>
                ) : null}

                {extended.length > 0 ? (
                  <div className={styles.group}>
                    <h3 className={styles.groupTitle}>Nearby communities</h3>
                    <ul className={styles.areaList}>
                      <li className={styles.area}>
                          <span className={styles.areaHead}>
                            <MapPin size={16} strokeWidth={1.8} aria-hidden="true" />
                            <span className={styles.areaName}>Neighboring communities</span>
                            <Badge tone="neutral">Communities</Badge>
                          </span>
                          <span className={styles.areaNames}>{extended.map((area) => area.name).join(' · ')}</span>
                          <span className={styles.areaNote}>Nearby communities we commonly serve around Cincinnati.</span>
                        </li>
                    </ul>
                  </div>
                ) : null}
              </div>

              <aside className={styles.aside} aria-label="Not sure about your area">
                <div className={styles.panel} data-theme="dark">
                  <h3 className={styles.panelTitle}>Not on the list?</h3>
                  <p className={styles.panelBody}>
                    Send us your location and project details. We will confirm whether your address
                    is within the area we can serve.
                  </p>
                  <Button as="link" to="/request-estimate" fullWidth iconRight={<ArrowUpRight size={17} />}>
                    Send us your ZIP code
                  </Button>
                </div>

                <div className={styles.panelPlain}>
                  <h3 className={styles.panelTitle}>Why we keep the area tight</h3>
                  <p className={styles.panelBody}>
                    A renovation needs people who can be on site quickly when something needs a
                    decision. Stretching too far is how contractors end up missing days. We would
                    rather cover a smaller area properly.
                  </p>
                </div>
              </aside>
            </div>
          )}
        </Container>
      </section>

      <CtaSection
        eyebrow="Let's find out"
        title="Tell us where you are."
        body="Send us your ZIP code with your project and we will confirm whether your address is in our service area."
      />
    </>
  );
}
