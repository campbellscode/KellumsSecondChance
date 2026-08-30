import type { SiteContent } from '@/lib/api/types';
import { business } from '@/content/business';

/**
 * Offline mirror of GET /api/site-content.
 *
 * Built from the compile-time defaults in business.ts, so the first paint and
 * the no-API case show exactly what the API would have shown before anyone
 * edited anything in the console.
 */
export const sampleSiteContent: SiteContent = {
  businessName: business.legalName,
  tagline: business.tagline,
  phoneDisplay: business.phone?.display ?? null,
  phoneE164: business.phone?.e164 ?? null,
  email: business.email,
  serviceAreaSummary: business.serviceAreaSummary,
  licensing: business.licensing,
  insurance: business.insurance,
  foundedYear: business.foundedYear,
  addressLine1: business.address?.streetAddress ?? null,
  addressLine2: null,
  addressLocality: business.address?.addressLocality ?? null,
  addressRegion: business.address?.addressRegion ?? null,
  addressPostalCode: business.address?.postalCode ?? null,
  siteUrl: business.siteUrl,
  ogImagePath: business.ogImagePath,
  socialLinks: business.social.map((s) => ({ label: s.label, href: s.href, icon: s.icon })),
  // Nobody has supplied trading hours, so the site shows none. See business.ts.
  officeHours: [],
};
