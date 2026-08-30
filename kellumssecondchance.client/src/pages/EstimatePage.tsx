import { useMemo } from 'react';
import { Check, Clock, Lock, MessageCircle } from 'lucide-react';
import styles from './EstimatePage.module.css';
import { Seo } from '@/lib/seo/Seo';
import { breadcrumbSchema, graph, organizationSchema } from '@/lib/seo/structuredData';
import { PageHero } from '@/components/marketing/PageHero';
import { EstimateForm } from '@/components/forms/EstimateForm';
import { Container } from '@/components/ui/Container';
import { useSiteContent } from '@/lib/siteContentContext';

const CRUMBS = [
  { name: 'Home', path: '/' },
  { name: 'Request an Estimate', path: '/request-estimate' },
];


const REASSURANCE = [
  {
    icon: Clock,
    title: 'Four short steps',
    body: 'Two minutes, and you can stop halfway through a sentence — we would rather have a rough note than nothing.',
  },
  {
    icon: MessageCircle,
    title: 'A real reply',
    body: 'A person reads it. You get an answer about whether it is something we take on, either way.',
  },
  {
    icon: Lock,
    title: 'Your details stay yours',
    body: 'We use what you send to reply to you. We do not sell it, share it, or add you to a mailing list.',
  },
];

const WHAT_HAPPENS = [
  'We read what you sent and get back to you.',
  'We arrange a time to come and look at the space.',
  'You get a written plan and a price before anything starts.',
];

export default function EstimatePage() {
  const { phone, email, site } = useSiteContent();
  const structuredData = useMemo(
    () => graph(organizationSchema(site), breadcrumbSchema(site, CRUMBS)),
    [site],
  );

  return (
    <>
      <Seo
        title="Request an Estimate"
        description="Tell us what needs a second chance. Four short steps, a real reply, and a written plan before anything starts."
        path="/request-estimate"
        structuredData={structuredData}
      />

      <PageHero
        eyebrow="Let's talk about your space"
        title="Tell us what needs a second chance."
        lead="You do not need a plan, a budget you are sure of, or the right words for it. Tell us what is bothering you about the room and we will take it from there."
        crumbs={CRUMBS}
        layout="plain"
      />

      <section className={styles.section} aria-labelledby="estimate-form-heading">
        <Container width="wide">
          <h2 id="estimate-form-heading" className="u-visually-hidden">
            Estimate request form
          </h2>

          <div className={styles.layout}>
            <div className={styles.formColumn}>
              <EstimateForm />
            </div>

            <aside className={styles.aside} aria-label="What to expect">
              <ul className={styles.reassurance}>
                {REASSURANCE.map((item) => (
                  <li key={item.title}>
                    <span className={styles.reassuranceIcon} aria-hidden="true">
                      <item.icon size={18} strokeWidth={1.6} />
                    </span>
                    <span className={styles.reassuranceBody}>
                      <strong>{item.title}</strong>
                      <span>{item.body}</span>
                    </span>
                  </li>
                ))}
              </ul>

              <div className={styles.panel}>
                <h3 className={styles.panelTitle}>What happens next</h3>
                <ol className={styles.steps}>
                  {WHAT_HAPPENS.map((item, index) => (
                    <li key={item}>
                      <span className={styles.stepNumber} aria-hidden="true">
                        {index + 1}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {phone || email ? (
                <div className={styles.panelAlt} data-theme="dark">
                  <h3 className={styles.panelTitle}>Rather just talk?</h3>
                  <p className={styles.panelText}>
                    Forms are not for everyone. Reach us directly and we will pick it up from there.
                  </p>
                  <ul className={styles.contactList}>
                    {phone ? (
                      <li>
                        <a href={phone.href} className={styles.contactLink}>
                          {phone.display}
                        </a>
                      </li>
                    ) : null}
                    {email ? (
                      <li>
                        <a href={`mailto:${email}`} className={styles.contactLink}>
                          {email}
                        </a>
                      </li>
                    ) : null}
                  </ul>
                </div>
              ) : null}

              <p className={styles.honest}>
                <Check size={15} strokeWidth={2.2} aria-hidden="true" />
                <span>
                  If your project is not something we should take on, we will say so and point you
                  toward someone who should.
                </span>
              </p>
            </aside>
          </div>
        </Container>
      </section>
    </>
  );
}
