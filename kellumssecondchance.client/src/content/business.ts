/**
 * ============================================================================
 *  KELLUM'S SECOND CHANCE RENOVATIONS — BUSINESS CONFIGURATION
 * ============================================================================
 *
 *  THIS IS THE ONLY FILE THAT SHOULD CONTAIN REAL BUSINESS FACTS.
 *
 *  Anything that has not been confirmed by the business is `null`. The UI is
 *  built to *omit* those elements entirely rather than invent a value, so the
 *  site never publishes a fabricated phone number, address, licence number,
 *  review count or founding year.
 *
 *  ▸ To go live: replace each `null` below with the real value.
 *  ▸ Search the codebase for `NEEDS_BUSINESS_INPUT` to find every open item.
 *
 *  In production the server can override these values from the SiteSetting
 *  table (see /api/site-content); this file is the compile-time default and
 *  the offline fallback.
 * ============================================================================
 */

/** Marks a value the business still has to supply. */
export type NeedsBusinessInput<T> = T | null;

export interface PhoneConfig {
  /** Human display form, e.g. "(555) 123-4567". */
  readonly display: string;
  /** E.164 form used for tel: links, e.g. "+15551234567". */
  readonly e164: string;
}

export interface PostalAddress {
  readonly streetAddress: NeedsBusinessInput<string>;
  readonly addressLocality: string;
  readonly addressRegion: string;
  readonly postalCode: NeedsBusinessInput<string>;
  readonly addressCountry: string;
}

export interface SocialLink {
  readonly label: string;
  readonly href: string;
  readonly icon: 'facebook' | 'instagram' | 'google' | 'youtube' | 'linkedin';
}

export interface OfficeHours {
  readonly label: string;
  readonly hours: string;
}

export interface BusinessProfile {
  readonly legalName: string;
  readonly shortName: string;
  readonly possessive: string;
  readonly tagline: string;
  readonly promise: string;
  readonly elevatorPitch: string;

  readonly phone: NeedsBusinessInput<PhoneConfig>;
  readonly email: NeedsBusinessInput<string>;
  readonly address: NeedsBusinessInput<PostalAddress>;

  /** Broad, non-specific description of where they work. Safe to display. */
  readonly serviceAreaSummary: string;
  readonly officeHours: readonly OfficeHours[];
  readonly social: readonly SocialLink[];

  /** Licence / insurance / bonding text. Rendered only when non-null. */
  readonly licensing: NeedsBusinessInput<string>;
  readonly insurance: NeedsBusinessInput<string>;

  /** Year the business started. Never guessed. */
  readonly foundedYear: NeedsBusinessInput<number>;

  readonly primaryCta: { readonly label: string; readonly href: string };
  readonly secondaryCta: { readonly label: string; readonly href: string };

  /** Canonical production origin, no trailing slash. Used for SEO URLs. */
  readonly siteUrl: string;
  readonly ogImagePath: string;
}

export const business: BusinessProfile = {
  legalName: "Kellum's Second Chance Renovations",
  shortName: "Kellum's",
  possessive: "Kellum's",
  tagline: 'Your home deserves a second chance.',
  promise:
    'We transform tired, outdated and damaged spaces into homes worth falling in love with again.',
  elevatorPitch:
    "Kellum's Second Chance Renovations is a residential renovation and remodeling company. We take on the rooms people have given up on — the dated kitchen, the unfinished basement, the bathroom that has needed help for a decade — and we bring them back better than they started.",

  // NEEDS_BUSINESS_INPUT — real phone number in display + E.164 form.
  phone: null,

  // NEEDS_BUSINESS_INPUT — monitored business email address.
  email: null,

  // NEEDS_BUSINESS_INPUT — confirmed business address (or set to null and
  // rely on serviceAreaSummary if the business does not publish an address).
  address: null,

  serviceAreaSummary:
    'Serving homeowners across our local service area. Not sure if you are in it? Ask — we will tell you straight.',

  officeHours: [
    { label: 'Monday – Friday', hours: '7:00 AM – 5:00 PM' },
    { label: 'Saturday', hours: 'By appointment' },
    { label: 'Sunday', hours: 'Closed' },
  ],

  // NEEDS_BUSINESS_INPUT — add real profile URLs; empty array renders nothing.
  social: [],

  // NEEDS_BUSINESS_INPUT — licence text, e.g. "Licensed contractor #123456".
  licensing: null,
  // NEEDS_BUSINESS_INPUT — e.g. "Fully insured — certificate available on request".
  insurance: null,

  // NEEDS_BUSINESS_INPUT — founding year, used for "since ____" copy.
  foundedYear: null,

  primaryCta: { label: 'Request an Estimate', href: '/request-estimate' },
  secondaryCta: { label: 'See Our Transformations', href: '/projects' },

  // NEEDS_BUSINESS_INPUT — replace with the live domain before launch.
  // Absolute canonical and Open Graph URLs are built from this, so a wrong value
  // here points every social preview and canonical tag at the wrong host.
  siteUrl: 'https://www.kellumssecondchance.com',

  // NEEDS_BUSINESS_INPUT — a real 1200x630 PNG or JPG social preview image.
  // The current file is a generated SVG placeholder. Facebook, LinkedIn, X and
  // iMessage do NOT render SVG Open Graph images, so shared links will preview
  // with no image until this is replaced. Drop a real file into
  // public/media/og/ and point this at it.
  ogImagePath: '/media/og/kellums-second-chance-og.svg',
} as const;

/** True when the value came back from configuration rather than a placeholder. */
export function isProvided<T>(value: NeedsBusinessInput<T>): value is T {
  return value !== null && value !== undefined;
}

export function telHref(phone: PhoneConfig): string {
  return `tel:${phone.e164}`;
}

export function mailtoHref(email: string): string {
  return `mailto:${email}`;
}

export function formatAddress(address: PostalAddress): string {
  return [
    address.streetAddress,
    `${address.addressLocality}, ${address.addressRegion} ${address.postalCode ?? ''}`.trim(),
  ]
    .filter(Boolean)
    .join('\n');
}
