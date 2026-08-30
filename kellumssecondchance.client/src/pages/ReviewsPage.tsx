import { useCallback, useMemo, useState } from 'react';
import styles from './ReviewsPage.module.css';
import { Seo } from '@/lib/seo/Seo';
import { breadcrumbSchema, graph, organizationSchema, reviewSchema } from '@/lib/seo/structuredData';
import { PageHero } from '@/components/marketing/PageHero';
import { TestimonialCard } from '@/components/marketing/TestimonialCard';
import { CtaSection } from '@/components/marketing/CtaSection';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { SampleContentNotice } from '@/components/ui/SampleContentNotice';
import { StarRating } from '@/components/ui/StarRating';
import { useAsync } from '@/lib/hooks/useAsync';
import { getTestimonials } from '@/lib/api/endpoints';
import { editorialMedia } from '@/content/media';
import { useSiteContent } from '@/lib/siteContentContext';
import { cn } from '@/lib/cn';

const CRUMBS = [
  { name: 'Home', path: '/' },
  { name: 'Reviews', path: '/reviews' },
];

export default function ReviewsPage() {
  const { site } = useSiteContent();
  const [category, setCategory] = useState('all');
  const loader = useCallback((signal: AbortSignal) => getTestimonials({}, signal), []);
  const testimonials = useAsync(loader);

  const all = useMemo(() => testimonials.data ?? [], [testimonials.data]);

  const categories = useMemo(() => {
    const set = new Map<string, number>();
    for (const item of all) {
      if (!item.projectCategory) continue;
      set.set(item.projectCategory, (set.get(item.projectCategory) ?? 0) + 1);
    }
    return [...set.entries()].map(([name, count]) => ({ name, count }));
  }, [all]);

  const filtered = useMemo(
    () => (category === 'all' ? all : all.filter((t) => t.projectCategory === category)),
    [all, category],
  );

  const featured = filtered.filter((t) => t.isFeatured);
  const rest = filtered.filter((t) => !t.isFeatured);
  const hasSample = all.some((t) => t.isSampleContent);
  const realOnly = all.filter((t) => !t.isSampleContent);

  // Aggregate rating is shown only when every displayed review is real.
  const showAggregate = all.length > 0 && realOnly.length === all.length;
  const average = showAggregate
    ? realOnly.reduce((sum, t) => sum + t.rating, 0) / realOnly.length
    : 0;

  const structuredData = useMemo(
    () => graph(organizationSchema(site), breadcrumbSchema(site, CRUMBS), reviewSchema(site, all)),
    [site, all],
  );

  return (
    <>
      <Seo
        title="Reviews"
        description="What homeowners say about working with Kellum’s Second Chance Renovations — in their words, not ours."
        path="/reviews"
        structuredData={structuredData}
      />

      <PageHero
        eyebrow="What homeowners say"
        title="The part we cannot write ourselves."
        lead="A contractor's own description of themselves is worth very little. This is the part that actually counts."
        crumbs={CRUMBS}
        image={editorialMedia.reviews}
        layout="panel"
        meta={
          showAggregate ? (
            <div className={styles.aggregate}>
              <StarRating value={average} size={18} hideLabel />
              <span className={styles.aggregateText}>
                {average.toFixed(1)} average from {realOnly.length}{' '}
                {realOnly.length === 1 ? 'review' : 'reviews'}
              </span>
            </div>
          ) : null
        }
      />

      <section className={styles.section} aria-labelledby="reviews-heading">
        <Container width="wide">
          <h2 id="reviews-heading" className="u-visually-hidden">
            Customer reviews
          </h2>

          {hasSample ? <SampleContentNotice context="reviews" className={styles.notice} /> : null}

          {testimonials.isLoading ? (
            <LoadingState label="Loading reviews" variant="cards" count={6} />
          ) : testimonials.status === 'error' ? (
            <ErrorState
              title="Reviews are not loading"
              description="Our reviews are temporarily unavailable. Please try again in a moment."
              onRetry={testimonials.reload}
            />
          ) : all.length === 0 ? (
            <EmptyState
              title="No reviews published yet"
              description="We would rather show you nothing than show you something we wrote ourselves. Real customer reviews will appear here as they come in — in the meantime, the work speaks for itself."
              action={
                <div className={styles.emptyActions}>
                  <Button as="link" to="/projects" size="sm">
                    See the projects
                  </Button>
                  <Button as="link" to="/request-estimate" size="sm" variant="secondary">
                    Request an estimate
                  </Button>
                </div>
              }
            />
          ) : (
            <>
              {categories.length > 1 ? (
                <div className={styles.filters} role="group" aria-label="Filter reviews by project type">
                  <button
                    type="button"
                    className={cn(styles.filter, category === 'all' && styles.filterActive)}
                    aria-pressed={category === 'all'}
                    onClick={() => setCategory('all')}
                  >
                    All reviews
                    <span className={styles.filterCount}>{all.length}</span>
                  </button>
                  {categories.map((item) => (
                    <button
                      type="button"
                      key={item.name}
                      className={cn(styles.filter, category === item.name && styles.filterActive)}
                      aria-pressed={category === item.name}
                      onClick={() => setCategory(item.name)}
                    >
                      {item.name}
                      <span className={styles.filterCount}>{item.count}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              {filtered.length === 0 ? (
                <EmptyState
                  title="No reviews in that category yet"
                  description="We have not published a review for this kind of project yet."
                  action={
                    <Button size="sm" variant="secondary" onClick={() => setCategory('all')}>
                      Show all reviews
                    </Button>
                  }
                />
              ) : (
                <>
                  <p className={styles.count} role="status" aria-live="polite">
                    Showing {filtered.length} {filtered.length === 1 ? 'review' : 'reviews'}
                  </p>

                  {featured.length > 0 ? (
                    <ul className={styles.featuredGrid}>
                      {featured.map((testimonial, index) => (
                        <li key={testimonial.id}>
                          <TestimonialCard testimonial={testimonial} variant="feature" index={index} />
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {rest.length > 0 ? (
                    <ul className={styles.grid}>
                      {rest.map((testimonial, index) => (
                        <li key={testimonial.id}>
                          <TestimonialCard testimonial={testimonial} index={index} />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              )}
            </>
          )}

          {/*
            * Tense matters here. While the page is showing seeded examples, a
            * present-tense "we do not write them" directly contradicts the sample
            * label above it — so the policy is stated as a commitment until real
            * reviews arrive, and as a fact once they have.
            */}
          <aside className={styles.futureNote} aria-label="About our reviews">
            <h2 className={styles.futureTitle}>Where these come from</h2>
            <p className={styles.futureBody}>
              {hasSample
                ? 'Every review published here will be collected directly from a homeowner we have worked with. We will not scrape them from anywhere, we will not write them ourselves, and we will not remove the ones that are less than glowing. The examples above are clearly marked as examples until then. If we ever add reviews from Google or another platform, they will be labelled with their source.'
                : 'Reviews here are collected directly from homeowners we have worked with. We do not scrape them from anywhere, we do not write them, and we do not remove the ones that are less than glowing. If we ever add reviews from Google or another platform, they will be labelled with their source.'}
            </p>
          </aside>
        </Container>
      </section>

      <CtaSection
        eyebrow="Your project next"
        title="Ready to give a room its second chance?"
      />
    </>
  );
}
