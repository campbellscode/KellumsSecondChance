import type { SiteContent } from '@/lib/api/types';
import { business } from '@/content/business';

/** Offline mirror of GET /api/site-content, built from the business config. */
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
  addressLocality: business.address?.addressLocality ?? null,
  addressRegion: business.address?.addressRegion ?? null,
  socialLinks: business.social.map((s) => ({ label: s.label, href: s.href, icon: s.icon })),
};
