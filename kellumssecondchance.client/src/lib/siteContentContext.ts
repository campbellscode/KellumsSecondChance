import { createContext, useContext } from 'react';
import { business } from '@/content/business';
import { sampleSiteContent } from '@/content/sampleContent/siteContent';
import type { SiteContent } from '@/lib/api/types';

/**
 * The runtime business profile.
 *
 * ONE SOURCE OF TRUTH. `content` is whatever GET /api/site-content returned,
 * which is whatever the admin console last saved. `src/content/business.ts`
 * only supplies the pre-response fallback and the brand constants that are not
 * operational data.
 *
 * The derived fields below exist so no component has to re-implement "do we
 * have enough of a phone number to render a link" — a rule that has to be
 * identical in the header, the footer, the contact page and the schema.
 */

export interface DisplayAddress {
  readonly lines: readonly string[];
  /** Single-line form, for aria-labels and map links. */
  readonly oneLine: string;
}

/** What structured data and canonical URLs are built from. */
export interface SiteProfile {
  /** Canonical origin, never with a trailing slash. */
  readonly siteUrl: string;
  readonly legalName: string;
  readonly shortName: string;
  readonly tagline: string;
  readonly elevatorPitch: string;
  readonly phoneE164: string | null;
  readonly email: string | null;
  readonly addressLine1: string | null;
  readonly addressLine2: string | null;
  readonly addressLocality: string | null;
  readonly addressRegion: string | null;
  readonly addressPostalCode: string | null;
  readonly foundedYear: number | null;
  readonly ogImagePath: string | null;
  readonly googleReviewUrl: string | null;
  readonly socialHrefs: readonly string[];
}

export interface SiteContentValue {
  readonly content: SiteContent;
  /** null unless the business has supplied a real phone number. */
  readonly phone: { readonly display: string; readonly href: string } | null;
  readonly email: string | null;
  /** null unless an address exists AND the business chose to publish it. */
  readonly address: DisplayAddress | null;
  readonly site: SiteProfile;
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export function deriveSiteContent(content: SiteContent): SiteContentValue {
  const phone =
    content.phoneDisplay && content.phoneE164
      ? { display: content.phoneDisplay, href: `tel:${content.phoneE164}` }
      : null;

  /*
   * The locality/region line only renders when BOTH halves exist — "Cincinnati,
   * " with a dangling comma is worse than omitting the line, and a lone state
   * abbreviation tells a visitor nothing.
   */
  const cityLine =
    content.addressLocality && content.addressRegion
      ? `${content.addressLocality}, ${content.addressRegion}${
          content.addressPostalCode ? ` ${content.addressPostalCode}` : ''
        }`
      : (content.addressLocality ?? content.addressRegion ?? null);

  const lines = [content.addressLine1, content.addressLine2, cityLine].filter(
    (line): line is string => Boolean(line && line.trim()),
  );

  const address: DisplayAddress | null =
    lines.length > 0 ? { lines, oneLine: lines.join(', ') } : null;

  const site: SiteProfile = {
    siteUrl: trimTrailingSlash(content.siteUrl ?? window.location.origin),
    legalName: content.businessName || business.legalName,
    shortName: business.shortName,
    tagline: content.tagline || business.tagline,
    elevatorPitch: business.elevatorPitch,
    phoneE164: content.phoneE164,
    email: content.email,
    addressLine1: content.addressLine1,
    addressLine2: content.addressLine2,
    addressLocality: content.addressLocality,
    addressRegion: content.addressRegion,
    addressPostalCode: content.addressPostalCode,
    foundedYear: content.foundedYear,
    ogImagePath: content.ogImagePath,
    googleReviewUrl: content.googleReviewUrl,
    socialHrefs: content.socialLinks.map((link) => link.href),
  };

  return { content, phone, email: content.email, address, site };
}

export const SiteContentContext = createContext<SiteContentValue | null>(null);

/**
 * Business contact details. Falls back to the compile-time defaults outside a
 * provider so a component is never left without a value.
 */
export function useSiteContent(): SiteContentValue {
  return useContext(SiteContentContext) ?? deriveSiteContent(sampleSiteContent);
}
