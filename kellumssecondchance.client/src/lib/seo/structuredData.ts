import { business, isProvided } from '@/content/business';
import type { FaqItem, ProjectDetail, ServiceDetail, ServiceSummary, Testimonial } from '@/lib/api/types';

/**
 * Schema.org builders.
 *
 * Hard rule: nothing here may emit a fact the business has not supplied. Phone,
 * address, founding date, licensing and ratings are all omitted when the value
 * is a placeholder — publishing a fabricated one in structured data is worse
 * than publishing it on the page, because search engines treat it as a claim.
 */

const CONTEXT = 'https://schema.org';
const ORG_ID = `${business.siteUrl}/#organization`;
const SITE_ID = `${business.siteUrl}/#website`;

export function organizationSchema(): object {
  const node: Record<string, unknown> = {
    '@type': 'HomeAndConstructionBusiness',
    '@id': ORG_ID,
    name: business.legalName,
    alternateName: business.shortName,
    url: `${business.siteUrl}/`,
    description: business.elevatorPitch,
    slogan: business.tagline,
    image: `${business.siteUrl}${business.ogImagePath}`,
    knowsAbout: [
      'Kitchen remodeling',
      'Bathroom renovation',
      'Basement finishing',
      'Interior renovation',
      'Carpentry and trim',
      'Home repair and restoration',
    ],
  };

  if (isProvided(business.phone)) node.telephone = business.phone.e164;
  if (isProvided(business.email)) node.email = business.email;

  if (isProvided(business.address)) {
    node.address = {
      '@type': 'PostalAddress',
      ...(business.address.streetAddress ? { streetAddress: business.address.streetAddress } : {}),
      addressLocality: business.address.addressLocality,
      addressRegion: business.address.addressRegion,
      ...(business.address.postalCode ? { postalCode: business.address.postalCode } : {}),
      addressCountry: business.address.addressCountry,
    };
  }

  if (isProvided(business.foundedYear)) node.foundingDate = String(business.foundedYear);
  if (business.social.length > 0) node.sameAs = business.social.map((s) => s.href);

  return node;
}

export function websiteSchema(): object {
  return {
    '@type': 'WebSite',
    '@id': SITE_ID,
    url: `${business.siteUrl}/`,
    name: business.legalName,
    publisher: { '@id': ORG_ID },
  };
}

export interface Crumb {
  readonly name: string;
  readonly path: string;
}

export function breadcrumbSchema(crumbs: readonly Crumb[]): object {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${business.siteUrl}${crumb.path}`,
    })),
  };
}

export function serviceSchema(service: ServiceDetail | ServiceSummary): object {
  return {
    '@type': 'Service',
    '@id': `${business.siteUrl}/services/${service.slug}#service`,
    name: service.name,
    description: service.summary,
    serviceType: service.name,
    provider: { '@id': ORG_ID },
    url: `${business.siteUrl}/services/${service.slug}`,
  };
}

/**
 * Project markup.
 *
 * Returns null for a seeded demonstration case study. Marking a written example
 * up as a CreativeWork the business created — with a `dateCreated` taken from an
 * illustrative completion date — would be a fabricated claim to search engines,
 * which is precisely what reviewSchema already refuses to do for sample reviews.
 */
export function projectSchema(project: ProjectDetail): object | null {
  if (project.isSampleContent) return null;

  const node: Record<string, unknown> = {
    '@type': 'CreativeWork',
    '@id': `${business.siteUrl}/projects/${project.slug}#project`,
    name: project.title,
    headline: project.title,
    description: project.summary,
    url: `${business.siteUrl}/projects/${project.slug}`,
    about: project.category,
    creator: { '@id': ORG_ID },
  };
  if (project.coverImage) node.image = `${business.siteUrl}${project.coverImage.src}`;
  if (project.completedOn) node.dateCreated = project.completedOn;
  return node;
}

/**
 * FAQ markup.
 *
 * Only publishes questions that have a real, business-approved answer. An item
 * still awaiting a policy decision is omitted entirely rather than marked up with
 * a placeholder — the same rule reviewSchema applies to sample testimonials.
 */
export function faqSchema(items: readonly FaqItem[]): object | null {
  const answered = items.filter((item) => !item.needsReview && item.answer.trim().length > 0);
  if (answered.length === 0) return null;

  return {
    '@type': 'FAQPage',
    mainEntity: answered.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

/**
 * Review schema.
 *
 * Returns null when ANY displayed testimonial is sample content: marking up
 * placeholder reviews as real ones would be a fabricated claim to search
 * engines, and aggregateRating is never emitted from demo data.
 */
export function reviewSchema(testimonials: readonly Testimonial[]): object | null {
  const real = testimonials.filter((t) => !t.isSampleContent);
  if (real.length === 0 || real.length !== testimonials.length) return null;

  return {
    '@type': 'HomeAndConstructionBusiness',
    '@id': ORG_ID,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: (real.reduce((sum, t) => sum + t.rating, 0) / real.length).toFixed(1),
      reviewCount: real.length,
      bestRating: 5,
      worstRating: 1,
    },
    review: real.slice(0, 10).map((t) => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: t.lastInitial ? `${t.firstName} ${t.lastInitial}.` : t.firstName,
      },
      reviewRating: { '@type': 'Rating', ratingValue: t.rating, bestRating: 5, worstRating: 1 },
      reviewBody: t.quote,
      ...(t.reviewedOn ? { datePublished: t.reviewedOn } : {}),
    })),
  };
}

/**
 * Collects schema nodes, dropping the ones that declined to emit.
 *
 * Returns the nodes only — `Seo` supplies the single `@context` for the whole
 * document. Every builder above may return null, so callers can pass a schema
 * unconditionally and let the honesty guards decide.
 */
export function graph(...nodes: (object | null)[]): readonly object[] {
  return nodes.filter((node): node is object => node !== null);
}

export const SCHEMA_CONTEXT = CONTEXT;
