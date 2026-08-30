import { ArrowUpRight, Clock, Mail, MapPin, Phone } from 'lucide-react';
import styles from './ContactPage.module.css';
import { Seo } from '@/lib/seo/Seo';
import { breadcrumbSchema, graph, organizationSchema } from '@/lib/seo/structuredData';
import { PageHero } from '@/components/marketing/PageHero';
import { EstimateForm } from '@/components/forms/EstimateForm';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { business, formatAddress, isProvided } from '@/content/business';
import { useSiteContent } from '@/lib/siteContentContext';
import { editorialMedia } from '@/content/media';

const CRUMBS = [
  { name: 'Home', path: '/' },
  { name: 'Contact', path: '/contact' },
];

const STRUCTURED_DATA = graph(organizationSchema(), breadcrumbSchema(CRUMBS));

export default function ContactPage() {
  const { phone, email, content } = useSiteContent();
  const hasDirectContact = Boolean(phone || email || isProvided(business.address));

  return (
    <>
      <Seo
        title="Contact"
        description="Get in touch with Kellum's Second Chance Renovations. Tell us about your project and a real person will get back to you."
        path="/contact"
        image={editorialMedia.contact.src}
        structuredData={STRUCTURED_DATA}
      />

      <PageHero
        eyebrow="Let's talk about your space"
        title="Tell us what you have been putting off."
        lead="You do not need the right words for it. Describe the room and what bothers you, and we will take it from there."
        crumbs={CRUMBS}
        image={editorialMedia.contact}
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

                  {isProvided(business.address) ? (
                    <li className={styles.contactItem}>
                      <span className={styles.contactIcon} aria-hidden="true">
                        <MapPin size={18} strokeWidth={1.7} />
                      </span>
                      <span className={styles.contactBody}>
                        <span className={styles.contactLabel}>Address</span>
                        <span className={styles.contactAddress}>{formatAddress(business.address)}</span>
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

              <ul className={styles.hours}>
                <li className={styles.hoursHead}>
                  <Clock size={15} strokeWidth={1.8} aria-hidden="true" />
                  <span>Working hours</span>
                </li>
                {business.officeHours.map((entry) => (
                  <li key={entry.label} className={styles.hoursRow}>
                    <span>{entry.label}</span>
                    <span className={styles.hoursValue}>{entry.hours}</span>
                  </li>
                ))}
              </ul>

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
