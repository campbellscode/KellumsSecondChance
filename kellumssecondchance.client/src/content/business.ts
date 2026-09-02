/**
 * ============================================================================
 *
 *   ██  KELLUM'S SECOND CHANCE RENOVATIONS — BRAND CONSTANTS & DEFAULTS  ██
 *
 * ============================================================================
 *
 *  ▸ THE BUSINESS'S CONTACT DETAILS ARE NO LONGER EDITED HERE.
 *
 *    Phone, email, address, licensing, insurance, founding year, social
 *    profiles, the website address and the social sharing image are all owned
 *    by the admin console at /admin/site-settings. They are stored in the
 *    SiteSettings database table, served by GET /api/site-content, and reach
 *    components through `useSiteContent()`.
 *
 *    That means the owner changes the company phone number in a browser, and
 *    the header, hero, footer, contact page, call bar and LocalBusiness
 *    structured data all follow — with no rebuild and no developer.
 *
 *  ▸ WHAT THIS FILE IS FOR, THEN.
 *
 *    Two things, and nothing else:
 *
 *      1. BRAND CONSTANTS — the identity and the written voice. The legal name,
 *         the tagline, the promise, the elevator pitch, the calls to action.
 *         These are design decisions, not operational data, and changing one is
 *         a deliberate act with copy implications.
 *
 *      2. COMPILE-TIME DEFAULTS — the values the site falls back to before the
 *         first API response arrives, and when the API is unreachable. The
 *         database always wins where it has a value.
 *
 *    There is exactly one source of truth for every field: for operational
 *    facts it is the database, and this file only supplies a starting point.
 *
 *  ─────────────────────────────────────────────────────────────────────────
 *  STILL OUTSTANDING
 *  ─────────────────────────────────────────────────────────────────────────
 *  Unconfirmed operational fields remain null. Each is ultimately set
 *  in the console rather than in code — the dashboard lists the blank ones as
 *  items needing attention, with a link straight to the field.
 *
 *   ❶ Phone number       → CANDIDATE FOUND, see `phoneCandidate` below
 *   ❷ Email address      → Site settings
 *   ❸ Business address   → Site settings (with a publish/don't-publish toggle)
 *   ❹ Website address    → Site settings — drives canonical and sharing URLs
 *   ❺ Licensing wording  → Site settings
 *   ❻ Insurance wording  → Site settings
 *   ❼ Founding year      → Site settings
 *   ❽ Social profiles    → Site settings
 *   ❾ Service area       → /admin/service-areas
 *   ❿ Social image       → Site settings (1200×630 PNG or JPG)
 *   ⓫ Trading hours      → Site settings — see the note below
 *
 *  Owner and crew details are the eleventh item and are prose, not data: they
 *  live in the "The people" section of src/pages/AboutPage.tsx.
 *
 *  Greppable marker for tooling and CI:  NEEDS_BUSINESS_INPUT
 * ============================================================================
 */

/** Marks a value the business still has to supply. */
export type NeedsBusinessInput<T> = T | null;

export interface PhoneConfig {
  /** Human display form, e.g. "(513) 620-0130". */
  readonly display: string;
  /** E.164 form used for tel: links, e.g. "+15136200130". */
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

/**
 * ⓫ TRADING HOURS ARE NOT DEFINED HERE, AND THERE IS NO DEFAULT.
 *
 * Earlier drafts of this file carried "Monday – Friday, 7:00 AM – 5:00 PM" and
 * the footer printed it. Nobody ever supplied those hours — they were invented
 * to make a layout look finished, and a homeowner could have driven over on the
 * strength of them.
 *
 * They are now a value like any other: entered at /admin/site-settings, and
 * omitted from the site entirely until they are. See `OfficeHours` in
 * lib/api/types.ts for the shape the API returns.
 */

export interface BusinessProfile {
  /* ---- Brand constants. Not editable from the console. ---- */
  readonly legalName: string;
  readonly shortName: string;
  readonly tagline: string;
  readonly promise: string;
  readonly elevatorPitch: string;
  readonly primaryCta: { readonly label: string; readonly href: string };
  readonly secondaryCta: { readonly label: string; readonly href: string };

  /* ---- Defaults for console-owned fields. The database wins. ---- */
  readonly phone: NeedsBusinessInput<PhoneConfig>;
  readonly email: NeedsBusinessInput<string>;
  readonly address: NeedsBusinessInput<PostalAddress>;
  readonly serviceAreaSummary: NeedsBusinessInput<string>;
  readonly social: readonly SocialLink[];
  readonly licensing: NeedsBusinessInput<string>;
  readonly insurance: NeedsBusinessInput<string>;
  readonly foundedYear: NeedsBusinessInput<number>;
  /** Canonical production origin, no trailing slash. */
  readonly siteUrl: NeedsBusinessInput<string>;
  readonly ogImagePath: NeedsBusinessInput<string>;
}

/**
 * ❶ PHONE — CANDIDATE READ OFF THE SUPPLIED LOGO, NOT YET PUBLISHED.
 *
 * The supplied artwork (Graphics/logo-1.jpg) prints "FREE ESTIMATES" above the
 * number below. That is the business's own marketing material, so this is very
 * likely correct — but it was read from a picture, and a single misread digit
 * would send every lead to a stranger. It is therefore recorded here and NOT
 * wired up.
 *
 * TO PUBLISH IT: check the digits, then enter them at /admin/site-settings.
 * The console is the place to do this now; setting `phone` below would only
 * change the pre-API fallback.
 */
export const phoneCandidate: PhoneConfig = {
  display: '513-620-0130',
  e164: '+15136200130',
};

export const business: BusinessProfile = {
  legalName: "Kellum’s Second Chance Renovations",
  shortName: "Kellum’s",
  tagline: 'Second chances are what we build.',
  promise:
    'We give tired, weathered and damaged home exteriors a second chance.',
  elevatorPitch:
    "Kellum’s is an exterior renovation, repair and restoration company serving homeowners in Cincinnati, Ohio. We are built on a simple belief: what something is today does not have to determine what it becomes tomorrow.",

  primaryCta: { label: 'Request an Estimate', href: '/request-estimate' },
  secondaryCta: { label: 'See Our Transformations', href: '/projects' },

  /* ------------------------------------------------------------------------
   * Below this line: defaults only. Set the real values at
   * /admin/site-settings — a value stored there overrides everything here.
   * ---------------------------------------------------------------------- */

  // ❶ PHONE
  phone: phoneCandidate,

  // ❷ EMAIL
  email: 'secondchancerenov@gmail.com',

  // ❸ ADDRESS — or none at all, which is normal for a mobile trade.
  address: {
    streetAddress: null,
    addressLocality: 'Cincinnati',
    addressRegion: 'OH',
    postalCode: '45236',
    addressCountry: 'US',
  },

  // ❹ SITE URL — the fallback origin used for canonical tags and sharing URLs
  //    until one is set in the console. A wrong value here misdirects SEO, so
  //    the console value should be set before launch.
  siteUrl: 'https://kellumssecondchance.com',

  // ❿ SOCIAL SHARING IMAGE — approved deployed brand artwork.
  ogImagePath: '/media/social/social-thumbnail-1.png',

  // ❺ / ❻ LICENSING AND INSURANCE — exact wording only.
  licensing: null,
  insurance: null,

  // ❼ FOUNDED YEAR — powers "serving homeowners since ____".
  foundedYear: null,

  // ❽ SOCIAL PROFILES — an empty list renders nothing at all.
  social: [],

  // ❾ SERVICE AREA — the cities, counties and postal codes live in the
  //    ServiceAreas table and are edited at /admin/service-areas. This is only
  //    the short prose summary, itself editable in Site settings.
  serviceAreaSummary: 'Serving homeowners in Cincinnati, Ohio.',
} as const;

/** True when the value came from configuration rather than being unset. */
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
