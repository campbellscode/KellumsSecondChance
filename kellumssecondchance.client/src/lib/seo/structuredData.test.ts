import { describe, expect, it } from 'vitest';
import { faqSchema, organizationSchema, projectSchema, reviewSchema } from './structuredData';
import { business } from '@/content/business';
import type { FaqItem, ProjectDetail, Testimonial } from '@/lib/api/types';

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
  it('omits contact details the business has not supplied', () => {
    const schema = organizationSchema() as Record<string, unknown>;

    // Publishing a fabricated phone number or address in structured data is
    // worse than publishing it on the page — search engines treat it as a claim.
    if (business.phone === null) expect(schema.telephone).toBeUndefined();
    if (business.email === null) expect(schema.email).toBeUndefined();
    if (business.address === null) expect(schema.address).toBeUndefined();
    if (business.foundedYear === null) expect(schema.foundingDate).toBeUndefined();
  });

  it('always publishes the name and type', () => {
    const schema = organizationSchema() as Record<string, unknown>;

    expect(schema['@type']).toBe('HomeAndConstructionBusiness');
    expect(schema.name).toBe(business.legalName);
  });

  it('omits sameAs entirely when there are no social profiles', () => {
    const schema = organizationSchema() as Record<string, unknown>;

    if (business.social.length === 0) expect(schema.sameAs).toBeUndefined();
  });
});

describe('reviewSchema', () => {
  it('emits nothing when there are no reviews', () => {
    expect(reviewSchema([])).toBeNull();
  });

  it('emits nothing when every review is sample content', () => {
    const samples = [testimonial({ isSampleContent: true }), testimonial({ id: 2, isSampleContent: true })];

    expect(reviewSchema(samples)).toBeNull();
  });

  it('emits nothing when even one displayed review is sample content', () => {
    // Marking up a mixed set would tell search engines the placeholder is real.
    const mixed = [testimonial(), testimonial({ id: 2, isSampleContent: true })];

    expect(reviewSchema(mixed)).toBeNull();
  });

  it('emits an aggregate rating once every review is genuine', () => {
    const real = [testimonial({ rating: 5 }), testimonial({ id: 2, rating: 4 })];

    const schema = reviewSchema(real) as Record<string, never>;
    expect(schema).not.toBeNull();

    const aggregate = schema.aggregateRating as unknown as Record<string, unknown>;
    expect(aggregate.reviewCount).toBe(2);
    expect(aggregate.ratingValue).toBe('4.5');
  });

  it('publishes reviewers as first name plus last initial only', () => {
    const schema = reviewSchema([testimonial()]) as Record<string, never>;
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
    const schema = projectSchema(project()) as Record<string, unknown>;

    expect(schema).not.toBeNull();
    expect(schema['@type']).toBe('CreativeWork');
    expect(schema.dateCreated).toBe('2025-04-18');
  });

  it('emits nothing for a seeded demonstration case study', () => {
    // A written example marked up as a CreativeWork the business created, with a
    // dateCreated taken from an illustrative date, is a fabricated claim.
    expect(projectSchema(project({ isSampleContent: true }))).toBeNull();
  });
});
