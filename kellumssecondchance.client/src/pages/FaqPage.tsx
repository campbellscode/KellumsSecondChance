import { useCallback, useMemo, useState } from 'react';
import styles from './FaqPage.module.css';
import { Seo } from '@/lib/seo/Seo';
import { breadcrumbSchema, faqSchema, graph, organizationSchema } from '@/lib/seo/structuredData';
import { PageHero } from '@/components/marketing/PageHero';
import { CtaSection } from '@/components/marketing/CtaSection';
import { Container } from '@/components/ui/Container';
import { Accordion } from '@/components/ui/Accordion';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useAsync } from '@/lib/hooks/useAsync';
import { getFaqs } from '@/lib/api/endpoints';
import { useSiteContent } from '@/lib/siteContentContext';
import { cn } from '@/lib/cn';
import type { FaqItem } from '@/lib/api/types';

const CRUMBS = [
  { name: 'Home', path: '/' },
  { name: 'FAQ', path: '/faq' },
];

interface Group {
  readonly slug: string;
  readonly name: string;
  readonly items: readonly FaqItem[];
}

function groupByCategory(items: readonly FaqItem[]): Group[] {
  const groups = new Map<string, { slug: string; name: string; items: FaqItem[] }>();
  for (const item of items) {
    const existing = groups.get(item.categorySlug);
    if (existing) existing.items.push(item);
    else groups.set(item.categorySlug, { slug: item.categorySlug, name: item.category, items: [item] });
  }
  return [...groups.values()];
}

export default function FaqPage() {
  const [active, setActive] = useState('all');
  const loader = useCallback((signal: AbortSignal) => getFaqs(signal), []);
  const faqs = useAsync(loader);
  const { phone, email } = useSiteContent();

  /*
   * Defence in depth. The API already withholds items awaiting a business
   * decision, but filtering here too means a stale cache or a future admin
   * endpoint can never leak an unanswered question onto the public page.
   */
  const published = useMemo(
    () => (faqs.data ?? []).filter((f) => !f.needsReview && f.answer.trim().length > 0),
    [faqs.data],
  );

  const groups = useMemo(() => groupByCategory(published), [published]);
  const visible = active === 'all' ? groups : groups.filter((g) => g.slug === active);

  /*
   * FAQ structured data is emitted for the full published set, not the filtered
   * view — the markup should describe the page's content, not the current UI state.
   */
  const structuredData = useMemo(
    () => graph(organizationSchema(), breadcrumbSchema(CRUMBS), faqSchema(published)),
    [published],
  );

  return (
    <>
      <Seo
        title="Frequently Asked Questions"
        description="Straight answers about estimates, scheduling, living in your home during work, changes, payments, materials and how a Kellum's project finishes."
        path="/faq"
        structuredData={structuredData}
      />

      <PageHero
        eyebrow="Straight answers"
        title="The questions people actually ask."
        lead="Including the awkward ones. If something you need to know is not here, ask us — we will add it."
        crumbs={CRUMBS}
        layout="plain"
      />

      <section className={styles.section} aria-labelledby="faq-heading">
        <Container width="wide">
          <h2 id="faq-heading" className="u-visually-hidden">
            Frequently asked questions
          </h2>

          {faqs.isLoading ? (
            <LoadingState label="Loading questions" variant="list" count={8} />
          ) : faqs.status === 'error' ? (
            <ErrorState
              title="Questions are not loading"
              description="Our FAQ is temporarily unavailable. Please try again shortly, or just ask us directly."
              onRetry={faqs.reload}
            />
          ) : published.length === 0 ? (
            <EmptyState
              title="No questions published yet"
              description="We are still writing these up. In the meantime, ask us anything directly — we would rather answer a real question than guess at one."
              action={
                <Button as="link" to="/contact" size="sm">
                  Ask us something
                </Button>
              }
            />
          ) : (
            <div className={styles.layout}>
              <nav className={styles.nav} aria-label="Question categories">
                <p className={styles.navTitle}>Jump to</p>
                <ul className={styles.navList}>
                  <li>
                    <button
                      type="button"
                      className={cn(styles.navLink, active === 'all' && styles.navLinkActive)}
                      aria-pressed={active === 'all'}
                      onClick={() => setActive('all')}
                    >
                      Everything
                      <span className={styles.navCount}>{published.length}</span>
                    </button>
                  </li>
                  {groups.map((group) => (
                    <li key={group.slug}>
                      <button
                        type="button"
                        className={cn(styles.navLink, active === group.slug && styles.navLinkActive)}
                        aria-pressed={active === group.slug}
                        onClick={() => setActive(group.slug)}
                      >
                        {group.name}
                        <span className={styles.navCount}>{group.items.length}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className={styles.content}>
                {visible.map((group) => (
                  <section className={styles.group} key={group.slug} aria-labelledby={`faq-${group.slug}`}>
                    <h3 id={`faq-${group.slug}`} className={styles.groupTitle}>
                      {group.name}
                    </h3>
                    <Accordion
                      headingLevel={4}
                      items={group.items.map((item) => ({
                        id: item.id,
                        question: item.question,
                        answer: <p>{item.answer}</p>,
                      }))}
                    />
                  </section>
                ))}

                <div className={styles.stillStuck}>
                  <h3 className={styles.stillStuckTitle}>Still not answered?</h3>
                  <p className={styles.stillStuckBody}>
                    Ask us the actual question. We would rather have a five-minute conversation than
                    have you guess — and if it comes up again, we will add it to this page.
                  </p>
                  <div className={styles.stillStuckActions}>
                    <Button as="link" to="/contact" size="sm">
                      Ask a question
                    </Button>
                    {phone ? (
                      <Button as="a" href={phone.href} size="sm" variant="secondary">
                        Call {phone.display}
                      </Button>
                    ) : email ? (
                      <Button as="a" href={`mailto:${email}`} size="sm" variant="secondary">
                        Email us
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Container>
      </section>

      <CtaSection />
    </>
  );
}
