import { useCallback, useMemo } from 'react';
import { ArrowUpRight } from 'lucide-react';
import styles from './HomePage.module.css';
import { Seo } from '@/lib/seo/Seo';
import { graph, organizationSchema, websiteSchema } from '@/lib/seo/structuredData';
import { Hero } from '@/components/marketing/Hero';
import { TrustStrip } from '@/components/marketing/TrustStrip';
import { StorySection } from '@/components/marketing/StorySection';
import { TransformationFeature } from '@/components/marketing/TransformationFeature';
import { ProcessSection } from '@/components/marketing/ProcessSection';
import { WhyKellums } from '@/components/marketing/WhyKellums';
import { CtaSection } from '@/components/marketing/CtaSection';
import { ServiceCard } from '@/components/marketing/ServiceCard';
import { ProjectCard } from '@/components/marketing/ProjectCard';
import { TestimonialCard } from '@/components/marketing/TestimonialCard';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { SampleContentNotice } from '@/components/ui/SampleContentNotice';
import { useAsync } from '@/lib/hooks/useAsync';
import { getProjects, getServices, getTestimonials, getTransformations } from '@/lib/api/endpoints';
import { business } from '@/content/business';
import { useSiteContent } from '@/lib/siteContentContext';


export default function HomePage() {
  const { site } = useSiteContent();
  const structuredData = useMemo(
    () => graph(organizationSchema(site), websiteSchema(site)),
    [site],
  );

  const servicesLoader = useCallback((signal: AbortSignal) => getServices(signal), []);
  const projectsLoader = useCallback(
    (signal: AbortSignal) => getProjects({ featuredOnly: true, take: 3 }, signal),
    [],
  );
  const testimonialsLoader = useCallback(
    (signal: AbortSignal) => getTestimonials({ featuredOnly: true }, signal),
    [],
  );
  const transformationsLoader = useCallback((signal: AbortSignal) => getTransformations(4, signal), []);

  const services = useAsync(servicesLoader);
  const projects = useAsync(projectsLoader);
  const testimonials = useAsync(testimonialsLoader);
  const transformations = useAsync(transformationsLoader);

  const featuredServices = (services.data ?? []).filter((s) => s.isFeatured).slice(0, 3);
  const otherServices = (services.data ?? []).filter((s) => !s.isFeatured).slice(0, 6);
  const reviews = (testimonials.data ?? []).slice(0, 3);
  const hasSampleReviews = reviews.some((t) => t.isSampleContent);
  // The homepage is the page most visitors see, and often the only one. Seeded
  // case studies must be labelled here too, not only in the gallery.
  const hasSampleProjects =
    (projects.data ?? []).some((p) => p.isSampleContent) ||
    (transformations.data ?? []).some((p) => p.isSampleContent);

  return (
    <>
      <Seo
        title={site.legalName}
        description={`${business.promise} Exterior renovation, repair and restoration services for Cincinnati homeowners.`}
        path="/"
        structuredData={structuredData}
      />

      <Hero />
      <TrustStrip />
      <StorySection />

      {/* ---- The Second Chance Effect ------------------------------------ */}
      <TransformationFeature
        projects={transformations.data ?? []}
      />

      {/* ---- Services ---------------------------------------------------- */}
      <section className={styles.services} aria-labelledby="services-heading">
        <Container width="wide">
          <SectionHeading
            eyebrow="What we take on"
            eyebrowIndex="03"
            id="services-heading"
            title="Exteriors we bring back."
            lead="From roofing and siding to decks, storm-damage repair and exterior restoration, tell us what your home needs."
            action={
              <Button as="link" to="/services" variant="secondary" iconRight={<ArrowUpRight size={17} />}>
                All services
              </Button>
            }
          />

          {services.isLoading ? (
            <LoadingState label="Loading our services" variant="cards" count={3} />
          ) : services.status === 'error' ? (
            <ErrorState
              title="We could not load our services"
              description="This is usually temporary. You can still tell us about your project and we will take it from there."
              onRetry={services.reload}
            />
          ) : featuredServices.length === 0 && otherServices.length === 0 ? (
            <EmptyState
              title="Services are being updated"
              description="Our service list is being refreshed. Get in touch and we will tell you straight away whether your project is something we take on."
              action={
                <Button as="link" to="/contact" size="sm">
                  Ask us about your project
                </Button>
              }
            />
          ) : (
            <>
              <div className={styles.serviceFeature}>
                {featuredServices.map((service, index) => (
                  <ServiceCard
                    key={service.slug}
                    service={service}
                    variant="feature"
                    index={index}
                    sizes="(min-width: 68rem) 31vw, (min-width: 44rem) 46vw, 92vw"
                  />
                ))}
              </div>

              {otherServices.length > 0 ? (
                <ul className={styles.serviceList}>
                  {otherServices.map((service, index) => (
                    <li key={service.slug} data-reveal style={{ ['--reveal-delay' as string]: `${index * 55}ms` }}>
                      <Button as="link" to={`/services/${service.slug}`} variant="ghost" className={styles.serviceChip}>
                        {service.name}
                        <ArrowUpRight size={14} strokeWidth={2} aria-hidden="true" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </Container>
      </section>

      {/* ---- Featured projects ------------------------------------------- */}
      <section className={styles.projects} aria-labelledby="projects-heading">
        <Container width="wide">
          <SectionHeading
            eyebrow="Second chances we have built"
            eyebrowIndex="04"
            id="projects-heading"
            title="See what is possible."
            lead="Each published case study explains what was wrong, what we did about it, and how the exterior turned out."
            action={
              <Button as="link" to="/projects" variant="secondary" iconRight={<ArrowUpRight size={17} />}>
                Every project
              </Button>
            }
          />

          {hasSampleProjects ? (
            <SampleContentNotice context="projects" className={styles.notice} />
          ) : null}

          {projects.isLoading ? (
            <LoadingState label="Loading featured projects" variant="cards" count={3} />
          ) : projects.status === 'error' ? (
            <ErrorState
              title="We could not load our projects"
              description="Our gallery is temporarily unavailable. Please try again in a moment."
              onRetry={projects.reload}
            />
          ) : (projects.data ?? []).length === 0 ? (
            <EmptyState
              title="Project photos are on the way"
              description="We are putting our case studies together. In the meantime, tell us what you are planning and we will talk you through similar work."
              action={
                <Button as="link" to="/request-estimate" size="sm">
                  Request an estimate
                </Button>
              }
            />
          ) : (
            <div className={styles.projectList}>
              {(projects.data ?? []).map((project, index) => (
                <ProjectCard
                  key={project.slug}
                  project={project}
                  variant="editorial"
                  index={index}
                  flip={index % 2 === 1}
                  sizes="(min-width: 62rem) 56vw, 92vw"
                />
              ))}
            </div>
          )}
        </Container>
      </section>

      <WhyKellums eyebrowIndex="05" />
      <ProcessSection eyebrowIndex="06" />

      {/* ---- Reviews ------------------------------------------------------ */}
      <section className={styles.reviews} aria-labelledby="reviews-heading">
        <Container width="wide">
          <SectionHeading
            eyebrow="What homeowners say"
            eyebrowIndex="07"
            id="reviews-heading"
            title="The part we cannot write ourselves."
            action={
              <Button as="link" to="/reviews" variant="secondary" iconRight={<ArrowUpRight size={17} />}>
                Read all reviews
              </Button>
            }
          />

          {testimonials.isLoading ? (
            <LoadingState label="Loading reviews" variant="cards" count={3} />
          ) : testimonials.status === 'error' ? (
            <ErrorState
              title="Reviews are not loading right now"
              description="Give it a moment and try again."
              onRetry={testimonials.reload}
            />
          ) : reviews.length === 0 ? (
            <EmptyState
              title="No reviews published yet"
              description="We would rather show you nothing than show you something we made up. Real customer reviews will appear here as they come in."
              action={
                <Button as="link" to="/projects" size="sm" variant="secondary">
                  Look at the work instead
                </Button>
              }
            />
          ) : (
            <>
              {hasSampleReviews ? <SampleContentNotice context="reviews" className={styles.notice} /> : null}
              <div className={styles.reviewGrid}>
                {reviews.map((testimonial, index) => (
                  <TestimonialCard
                    key={testimonial.id}
                    testimonial={testimonial}
                    variant={index === 0 ? 'feature' : 'default'}
                    index={index}
                  />
                ))}
              </div>
            </>
          )}
        </Container>
      </section>

      <section className={styles.opportunity} aria-labelledby="opportunity-heading">
        <Container width="narrow">
          <SectionHeading
            eyebrow="Build what comes next"
            eyebrowIndex="08"
            id="opportunity-heading"
            title="Good work can build more than a home exterior."
            lead="If you are ready to work, learn and take pride in what you build, there may be a place for your next chapter at Kellum’s."
            action={<Button as="link" to="/work-with-us" variant="secondary">Work With Us</Button>}
          />
        </Container>
      </section>

      <CtaSection />
    </>
  );
}
