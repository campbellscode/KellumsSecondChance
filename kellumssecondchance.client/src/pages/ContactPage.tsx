import { useMemo } from 'react';
import { ArrowUpRight, Clock, Mail, MapPin, Phone } from 'lucide-react';
import styles from './ContactPage.module.css';
import { Seo } from '@/lib/seo/Seo';
import { breadcrumbSchema, graph, organizationSchema } from '@/lib/seo/structuredData';
import { PageHero } from '@/components/marketing/PageHero';
import { EstimateForm } from '@/components/forms/EstimateForm';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Photo } from '@/components/ui/Photo';
import { business } from '@/content/business';
import { useSiteContent } from '@/lib/siteContentContext';
import { editorialMedia } from '@/content/media';

const CRUMBS = [
  { name: 'Home', path: '/' },
  { name: 'Contact', path: '/contact' },
];


export default function ContactPage() {
  const { phone, email, content, address, site } = useSiteContent();
  const structuredData = useMemo(
    () => graph(organizationSchema(site), breadcrumbSchema(site, CRUMBS)),
    [site],
  );
  const hasDirectContact = Boolean(phone || email || address);

  return (
    <>
      <Seo
        title="Contact"
        description="Contact Kellum’s Second Chance Renovations about an exterior renovation, repair or restoration project in Cincinnati."
        path="/contact"
        structuredData={structuredData}
      />

      <PageHero
        eyebrow="Let's talk about your exterior"
        title="Tell us what your home needs."
        lead="Describe the exterior work you have in mind and share any details that may help us understand the project."
        crumbs={CRUMBS}
        panelContent={(
          <Photo
            image={editorialMedia.contact}
            ratio="auto"
            className={styles.contactPhoto}
            sizes="(min-width: 68rem) 42vw, 92vw"
            priority
            zoomOnHover
          />
        )}
        enablePanelZoom
        layout="panel"
      />

      <section className={styles.section} aria-labelledby="contact-heading">
        <Container width="wide">
          <h2 id="contact-heading" className="u-visually-hidden">
            Contact details and enquiry form
          </h2>

          <div className={styles.layout}>
            <div className={styles.details}>
              <Eyebrow index="01">Ways to reach us</Eyebrow>

              {hasDirectContact ? (
                <ul className={styles.contactList}>
                  {phone ? (
                    <li className={styles.contactItem}>
                      <span className={styles.contactIcon} aria-hidden="true">
                        <Phone size={18} strokeWidth={1.7} />
                      </span>
                      <span className={styles.contactBody}>
                        <span className={styles.contactLabel}>Call or text</span>
                        <a href={phone.href} className={styles.contactValue}>
                          {phone.display}
                        </a>
                      </span>
                    </li>
                  ) : null}

                  {email ? (
                    <li className={styles.contactItem}>
                      <span className={styles.contactIcon} aria-hidden="true">
                        <Mail size={18} strokeWidth={1.7} />
                      </span>
                      <span className={styles.contactBody}>
                        <span className={styles.contactLabel}>Email</span>
                        <a href={`mailto:${email}`} className={styles.contactValue}>
                          {email}
                        </a>
                      </span>
                    </li>
                  ) : null}

                  {address ? (
                    <li className={styles.contactItem}>
                      <span className={styles.contactIcon} aria-hidden="true">
                        <MapPin size={18} strokeWidth={1.7} />
                      </span>
                      <span className={styles.contactBody}>
                        <span className={styles.contactLabel}>Address</span>
                        <span className={styles.contactAddress}>
                          {address.lines.map((line) => (
                            <span key={line}>{line}</span>
                          ))}
                        </span>
                      </span>
                    </li>
                  ) : null}
                </ul>
              ) : (
                /*
                 * No phone or email has been supplied yet. Rather than print a
                 * placeholder number, the page routes people to the form — which
                 * works — and says plainly what is going on.
                 */
                <div className={styles.noContact}>
                  <p className={styles.noContactTitle}>
                    The form below is the fastest way to reach us right now.
                  </p>
                  <p className={styles.noContactBody}>
                    Our published phone number and email are being set up. Anything sent through the
                    form reaches us directly, and you will get a reference number the moment it lands.
                  </p>
                </div>
              )}

              {/*
                Hours appear only once somebody has entered them at
                /admin/site-settings. The whole block goes rather than showing
                a heading with nothing under it.
              */}
              {content.officeHours.length > 0 ? (
                <ul className={styles.hours}>
                  <li className={styles.hoursHead}>
                    <Clock size={15} strokeWidth={1.8} aria-hidden="true" />
                    <span>Working hours</span>
                  </li>
                  {content.officeHours.map((entry) => (
                    <li key={entry.label} className={styles.hoursRow}>
                      <span>{entry.label}</span>
                      <span className={styles.hoursValue}>{entry.hours}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className={styles.areaCard} data-theme="dark">
                <h3 className={styles.areaTitle}>Where we work</h3>
                <p className={styles.areaBody}>
                  {content.serviceAreaSummary ?? business.serviceAreaSummary}
                </p>
                <Button as="link" to="/service-area" variant="link" iconRight={<ArrowUpRight size={15} />}>
                  See our service area
                </Button>
              </div>

              <p className={styles.responseNote}>
                A person reads every message. If your project is not something we should take on, we
                will tell you that and point you somewhere better.
              </p>
            </div>

            <div className={styles.formColumn}>
              <div className={styles.formIntro}>
                <Eyebrow index="02">Send us your project</Eyebrow>
                <p className={styles.formIntroText}>
                  Same form as the estimate request — four short steps, and you get a reference
                  number when it lands.
                </p>
              </div>
              <EstimateForm />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
