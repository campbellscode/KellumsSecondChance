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
import { editorialMedia } from '@/content/media';
import type { ServiceArea } from '@/lib/api/types';

const CRUMBS = [
  { name: 'Home', path: '/' },
  { name: 'Service Area', path: '/service-area' },
];


const KIND_LABEL: Record<ServiceArea['kind'], string> = {
  City: 'City',
  County: 'County',
  PostalCode: 'ZIP code',
  Region: 'Region',
};

export default function ServiceAreaPage() {
  const loader = useCallback((signal: AbortSignal) => getServiceAreas(signal), []);
  const areas = useAsync(loader);
  const { content, site } = useSiteContent();
  const structuredData = useMemo(
    () => graph(organizationSchema(site), breadcrumbSchema(site, CRUMBS)),
    [site],
  );

  const list = areas.data ?? [];
  const primary = list.filter((a) => a.isPrimary);
  const extended = list.filter((a) => !a.isPrimary);
  const hasSample = list.some((a) => a.isSampleContent);

  return (
    <>
      <Seo
        title="Service Area"
        description="Where Kellum’s Second Chance Renovations works. Not sure if you are in our area? Ask — we will tell you straight."
        path="/service-area"
        structuredData={structuredData}
      />

      <PageHero
        eyebrow="Where we work"
        title="Close enough to show up when we say we will."
        lead={content.serviceAreaSummary ?? business.serviceAreaSummary}
        crumbs={CRUMBS}
        image={editorialMedia.serviceArea}
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
                {primary.length > 0 ? (
                  <div className={styles.group}>
                    <h3 className={styles.groupTitle}>Core service area</h3>
                    <ul className={styles.areaList}>
                      {primary.map((area) => (
                        <li className={styles.area} key={area.id}>
                          <span className={styles.areaHead}>
                            <MapPin size={16} strokeWidth={1.8} aria-hidden="true" />
                            <span className={styles.areaName}>{area.name}</span>
                            <Badge tone="outline">{KIND_LABEL[area.kind]}</Badge>
                          </span>
                          {area.stateOrRegion ? (
                            <span className={styles.areaRegion}>{area.stateOrRegion}</span>
                          ) : null}
                          {area.postalCodes.length > 0 ? (
                            <span className={styles.postalCodes}>
                              {area.postalCodes.join(' · ')}
                            </span>
                          ) : null}
                          {area.note ? <span className={styles.areaNote}>{area.note}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {extended.length > 0 ? (
                  <div className={styles.group}>
                    <h3 className={styles.groupTitle}>We also travel to</h3>
                    <ul className={styles.areaList}>
                      {extended.map((area) => (
                        <li className={styles.area} key={area.id}>
                          <span className={styles.areaHead}>
                            <MapPin size={16} strokeWidth={1.8} aria-hidden="true" />
                            <span className={styles.areaName}>{area.name}</span>
                            <Badge tone="neutral">{KIND_LABEL[area.kind]}</Badge>
                          </span>
                          {area.note ? <span className={styles.areaNote}>{area.note}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <aside className={styles.aside} aria-label="Not sure about your area">
                <div className={styles.panel} data-theme="dark">
                  <h3 className={styles.panelTitle}>Not on the list?</h3>
                  <p className={styles.panelBody}>
                    Ask anyway. Travel time matters more than a boundary on a map, and for the right
                    project we go further. The worst answer you will get is an honest no.
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
        body="Send us your ZIP code with your project and we will confirm straight away whether we can get to you."
      />
    </>
  );
}
