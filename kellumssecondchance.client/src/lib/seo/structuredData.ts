import type { SiteProfile } from '@/lib/siteContentContext';
import type { FaqItem, ProjectDetail, ServiceArea, ServiceDetail, ServiceSummary, Testimonial } from '@/lib/api/types';

/**
 * Schema.org builders.
 *
 * Hard rule: nothing here may emit a fact the business has not supplied. Phone,
 * address, founding date, licensing and ratings are all omitted when the value
 * is a placeholder — publishing a fabricated one in structured data is worse
 * than publishing it on the page, because search engines treat it as a claim.
 *
 * Every builder takes the LIVE profile (see `useSiteContent().site`) rather
 * than reading a compile-time constant. That is what makes an address entered
 * in the admin console actually reach Google, and what stops a stale build-time
 * domain from appearing in canonical URLs after the real one is set.
 */

const CONTEXT = 'https://schema.org';

function orgId(site: SiteProfile): string {
  return `${site.siteUrl}/#organization`;
}

export function organizationSchema(site: SiteProfile, serviceAreas: readonly ServiceArea[] = []): object {
  const node: Record<string, unknown> = {
    '@type': 'HomeAndConstructionBusiness',
    '@id': orgId(site),
    name: site.legalName,
    alternateName: site.shortName,
    url: `${site.siteUrl}/`,
    description: site.elevatorPitch,
    slogan: site.tagline,
    knowsAbout: [
      'Roofing',
      'Siding',
      'Gutters and downspouts',
      'Decks and porches',
      'Exterior carpentry',
      'Exterior repair and restoration',
    ],
  };

  // Only claim an image once a real one exists.
  if (site.ogImagePath) node.image = `${site.siteUrl}${site.ogImagePath}`;

  if (site.phoneE164) node.telephone = site.phoneE164;
  if (site.email) node.email = site.email;

  /*
   * PostalAddress needs at least a locality to be meaningful, and the fields
   * only arrive at all when the business ticked "publish this address" — the
   * server withholds them otherwise. A street line with no city, or a state
   * with nothing else, is worse than no address node.
   */
  if (site.addressLocality && site.addressRegion) {
    node.address = {
      '@type': 'PostalAddress',
      ...(site.addressLine1 ? { streetAddress: site.addressLine1 } : {}),
      addressLocality: site.addressLocality,
      addressRegion: site.addressRegion,
      ...(site.addressPostalCode ? { postalCode: site.addressPostalCode } : {}),
      addressCountry: 'US',
    };
  }

  if (site.foundedYear !== null) node.foundingDate = String(site.foundedYear);
  if (site.socialHrefs.length > 0) node.sameAs = [...site.socialHrefs];
  if (serviceAreas.length > 0) {
    node.areaServed = serviceAreas.map((area) => ({
      '@type': area.kind === 'County' ? 'AdministrativeArea' : 'City',
      name: area.stateOrRegion && !area.name.includes(area.stateOrRegion)
        ? `${area.name}, ${area.stateOrRegion}`
        : area.name,
    }));
  }

  return node;
}

export function websiteSchema(site: SiteProfile): object {
  return {
    '@type': 'WebSite',
    '@id': `${site.siteUrl}/#website`,
    url: `${site.siteUrl}/`,
    name: site.legalName,
    publisher: { '@id': orgId(site) },
  };
}

export interface Crumb {
  readonly name: string;
  readonly path: string;
}

export function breadcrumbSchema(site: SiteProfile, crumbs: readonly Crumb[]): object {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${site.siteUrl}${crumb.path}`,
    })),
  };
}

export function serviceSchema(site: SiteProfile, service: ServiceDetail | ServiceSummary): object {
  return {
    '@type': 'Service',
    '@id': `${site.siteUrl}/services/${service.slug}#service`,
    name: service.name,
    description: service.summary,
    serviceType: service.name,
    provider: { '@id': orgId(site) },
    url: `${site.siteUrl}/services/${service.slug}`,
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
export function projectSchema(site: SiteProfile, project: ProjectDetail): object | null {
  if (project.isSampleContent) return null;

  const node: Record<string, unknown> = {
    '@type': 'CreativeWork',
    '@id': `${site.siteUrl}/projects/${project.slug}#project`,
    name: project.title,
    headline: project.title,
    description: project.summary,
    url: `${site.siteUrl}/projects/${project.slug}`,
    about: project.category,
    creator: { '@id': orgId(site) },
  };
  if (project.coverImage) node.image = `${site.siteUrl}${project.coverImage.src}`;
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
export function reviewSchema(site: SiteProfile, testimonials: readonly Testimonial[]): object | null {
  const real = testimonials.filter((t) => !t.isSampleContent);
  if (real.length === 0 || real.length !== testimonials.length) return null;

  return {
    '@type': 'HomeAndConstructionBusiness',
    '@id': orgId(site),
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
