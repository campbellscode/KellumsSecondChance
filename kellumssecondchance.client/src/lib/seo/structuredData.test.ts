import { describe, expect, it } from 'vitest';
import { faqSchema, organizationSchema, projectSchema, reviewSchema } from './structuredData';
import { deriveSiteContent } from '@/lib/siteContentContext';
import { sampleSiteContent } from '@/content/sampleContent/siteContent';
import type { FaqItem, ProjectDetail, Testimonial } from '@/lib/api/types';

/** The build-time profile contains only facts confirmed by the business. */
const confirmedSite = deriveSiteContent(sampleSiteContent).site;

const blankSite = deriveSiteContent({
  ...sampleSiteContent,
  phoneDisplay: null,
  phoneE164: null,
  email: null,
  addressLine1: null,
  addressLine2: null,
  addressLocality: null,
  addressRegion: null,
  addressPostalCode: null,
  ogImagePath: null,
}).site;

/** The same profile with real values, as the admin console would supply them. */
const suppliedSite = deriveSiteContent({
  ...sampleSiteContent,
  businessName: 'Test Renovations',
  phoneDisplay: '(555) 010-0100',
  phoneE164: '+15550100100',
  email: 'hello@example.com',
  addressLine1: '12 Example Street',
  addressLocality: 'Example City',
  addressRegion: 'OH',
  addressPostalCode: '45001',
  foundedYear: 2011,
  siteUrl: 'https://example.test',
  ogImagePath: '/brand/card.png',
  socialLinks: [{ label: 'Facebook', href: 'https://facebook.test/x', icon: 'facebook' }],
}).site;

function testimonial(overrides: Partial<Testimonial> = {}): Testimonial {
  return {
    id: 1,
    firstName: 'Dana',
    lastInitial: 'O',
    location: 'Example City',
    rating: 5,
    quote: 'They did the work properly and cleaned up every evening.',
    projectCategory: 'Kitchen Remodeling',
    reviewedOn: '2025-04-29',
    isFeatured: true,
    isSampleContent: false,
    source: 'Direct',
    ...overrides,
  };
}

describe('organizationSchema', () => {
  it('publishes the confirmed contact and locality defaults', () => {
    const schema = organizationSchema(confirmedSite) as Record<string, unknown>;

    expect(schema.telephone).toBe('+15136200130');
    expect(schema.email).toBe('secondchancerenov@gmail.com');
    expect(schema.address).toEqual({
      '@type': 'PostalAddress',
      addressLocality: 'Cincinnati',
      addressRegion: 'OH',
      postalCode: '45236',
      addressCountry: 'US',
    });
  });

  it('omits contact details the business has not supplied', () => {
    const schema = organizationSchema(blankSite) as Record<string, unknown>;

    // Publishing a fabricated phone number or address in structured data is
    // worse than publishing it on the page — search engines treat it as a claim.
    expect(schema.telephone).toBeUndefined();
    expect(schema.email).toBeUndefined();
    expect(schema.address).toBeUndefined();
    expect(schema.foundingDate).toBeUndefined();
    expect(schema.image).toBeUndefined();
    expect(schema.sameAs).toBeUndefined();
  });

  it('always publishes the name and type', () => {
    const schema = organizationSchema(blankSite) as Record<string, unknown>;

    expect(schema['@type']).toBe('HomeAndConstructionBusiness');
    expect(schema.name).toBe(blankSite.legalName);
  });

  it('publishes every detail the business HAS supplied', () => {
    const schema = organizationSchema(suppliedSite) as Record<string, unknown>;

    expect(schema.name).toBe('Test Renovations');
    expect(schema.telephone).toBe('+15550100100');
    expect(schema.email).toBe('hello@example.com');
    expect(schema.foundingDate).toBe('2011');
    expect(schema.image).toBe('https://example.test/brand/card.png');
    expect(schema.sameAs).toEqual(['https://facebook.test/x']);
    expect(schema.address).toEqual({
      '@type': 'PostalAddress',
      streetAddress: '12 Example Street',
      addressLocality: 'Example City',
      addressRegion: 'OH',
      postalCode: '45001',
      addressCountry: 'US',
    });
  });

  it('builds every identifier from the console-supplied domain', () => {
    const schema = organizationSchema(suppliedSite) as Record<string, unknown>;

    // A stale build-time domain in @id or url would fragment the entity graph.
    expect(schema['@id']).toBe('https://example.test/#organization');
    expect(schema.url).toBe('https://example.test/');
  });

  it('refuses a half-supplied address rather than emitting a partial one', () => {
    const site = deriveSiteContent({
      ...sampleSiteContent,
      addressLine1: '12 Example Street',
      addressLocality: 'Example City',
      addressRegion: null,
    }).site;

    expect((organizationSchema(site) as Record<string, unknown>).address).toBeUndefined();
  });
});

describe('reviewSchema', () => {
  it('emits nothing when there are no reviews', () => {
    expect(reviewSchema(blankSite, [])).toBeNull();
  });

  it('emits nothing when every review is sample content', () => {
    const samples = [testimonial({ isSampleContent: true }), testimonial({ id: 2, isSampleContent: true })];

    expect(reviewSchema(blankSite, samples)).toBeNull();
  });

  it('emits nothing when even one displayed review is sample content', () => {
    // Marking up a mixed set would tell search engines the placeholder is real.
    const mixed = [testimonial(), testimonial({ id: 2, isSampleContent: true })];

    expect(reviewSchema(blankSite, mixed)).toBeNull();
  });

  it('emits an aggregate rating once every review is genuine', () => {
    const real = [testimonial({ rating: 5 }), testimonial({ id: 2, rating: 4 })];

    const schema = reviewSchema(blankSite, real) as Record<string, never>;
    expect(schema).not.toBeNull();

    const aggregate = schema.aggregateRating as unknown as Record<string, unknown>;
    expect(aggregate.reviewCount).toBe(2);
    expect(aggregate.ratingValue).toBe('4.5');
  });

  it('publishes reviewers as first name plus last initial only', () => {
    const schema = reviewSchema(blankSite, [testimonial()]) as Record<string, never>;
    const reviews = schema.review as unknown as { author: { name: string } }[];

    expect(reviews[0].author.name).toBe('Dana O.');
  });
});

function faq(overrides: Partial<FaqItem> = {}): FaqItem {
  return {
    id: 1,
    question: 'Do you handle permits?',
    answer: 'For work that requires them, permitting is part of the plan.',
    category: 'The Renovation Process',
    categorySlug: 'the-process',
    displayOrder: 1,
    needsReview: false,
    reviewNote: null,
    ...overrides,
  };
}

describe('faqSchema', () => {
  it('marks up answered questions', () => {
    const schema = faqSchema([faq()]) as Record<string, never>;

    expect(schema).not.toBeNull();
    expect((schema.mainEntity as unknown as unknown[]).length).toBe(1);
  });

  it('omits a question still awaiting a business decision', () => {
    // Publishing a placeholder answer as an acceptedAnswer would put a fabricated
    // claim into a Google FAQ rich result.
    const schema = faqSchema([faq({ needsReview: true, answer: '' })]);

    expect(schema).toBeNull();
  });

  it('drops only the unanswered items from a mixed set', () => {
    const schema = faqSchema([
      faq(),
      faq({ id: 2, needsReview: true, answer: '' }),
    ]) as Record<string, never>;

    expect((schema.mainEntity as unknown as unknown[]).length).toBe(1);
  });

  it('emits nothing when there is nothing answered', () => {
    expect(faqSchema([])).toBeNull();
  });
});

function project(overrides: Partial<ProjectDetail> = {}): ProjectDetail {
  return {
    id: 1,
    slug: 'maple-street-kitchen',
    title: 'The Kitchen That Stopped Working',
    category: 'Kitchen Remodeling',
    categorySlug: 'kitchen-remodeling',
    location: 'Maple Street',
    summary: 'A galley kitchen rebuilt into an open, working room.',
    completedOn: '2025-04-18',
    coverImage: null,
    isFeatured: true,
    displayOrder: 1,
    hasBeforeAfter: true,
    isSampleContent: false,
    challenge: 'x',
    vision: 'x',
    transformation: 'x',
    outcome: null,
    durationLabel: null,
    propertyType: null,
    serviceSlugs: [],
    serviceNames: [],
    highlights: [],
    images: [],
    metaTitle: null,
    metaDescription: null,
    ...overrides,
  };
}

describe('projectSchema', () => {
  it('marks up a real completed project', () => {
    const schema = projectSchema(blankSite, project()) as Record<string, unknown>;

    expect(schema).not.toBeNull();
    expect(schema['@type']).toBe('CreativeWork');
    expect(schema.dateCreated).toBe('2025-04-18');
  });

  it('emits nothing for a seeded demonstration case study', () => {
    // A written example marked up as a CreativeWork the business created, with a
    // dateCreated taken from an illustrative date, is a fabricated claim.
    expect(projectSchema(blankSite, project({ isSampleContent: true }))).toBeNull();
  });
});
