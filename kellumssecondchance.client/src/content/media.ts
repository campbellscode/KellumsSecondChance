import type { ImageAsset } from '@/lib/api/types';

/**
 * ============================================================================
 *  IMAGE MANIFEST — PLACEHOLDER ARTWORK
 * ============================================================================
 *
 *  Every file referenced here is a generated architectural rendering, NOT a
 *  photograph of real Kellum’s work. They exist so the layouts can be judged
 *  with realistic tone and composition before real photography arrives.
 *
 *  ▸ Regenerate:  node scripts/generate-placeholder-media.mjs
 *  ▸ Go live:     drop real images into public/media using the same paths (any
 *                 format), update `width`/`height` to the real pixel dimensions,
 *                 rewrite `alt` to describe the actual room, and — if you export
 *                 AVIF/WebP variants — add them to `sources`.
 *
 *  Alt text below describes the *rendering*. Replace it when real photos land:
 *  screen-reader users must hear what is actually in the picture.
 * ============================================================================
 */

const LANDSCAPE = { width: 1600, height: 1067 } as const;
const PORTRAIT = { width: 1000, height: 1250 } as const;
const WIDE = { width: 1920, height: 960 } as const;

function landscape(src: string, alt: string): ImageAsset {
  return { src, alt, ...LANDSCAPE };
}
function portrait(src: string, alt: string): ImageAsset {
  return { src, alt, ...PORTRAIT };
}
function wide(src: string, alt: string): ImageAsset {
  return { src, alt, ...WIDE };
}

export const heroMedia = {
  before: {
    src: '/media/projects/home-hero-before.jpg',
    width: 1254,
    height: 1254,
    alt: 'A brick home’s front porch before renovation, with black metal railings and concrete steps.',
  },
  after: {
    src: '/media/projects/home-hero-after.jpg',
    width: 1254,
    height: 1254,
    alt: 'The same brick front porch after renovation, with new white railings and a refreshed entry.',
  },
} as const;

export const editorialMedia = {
  story: {
    src: '/media/editorial/second-chance-2.jpg',
    width: 206,
    height: 206,
    alt: 'A worker repairing the upper front-gable exterior of a house.',
  },
  storyPortrait: {
    src: '/media/editorial/second-chance-1.jpg',
    width: 206,
    height: 206,
    alt: 'A tall yellow historic house with ladders reaching its upper exterior.',
  },
  aboutSecondChance: {
    src: '/media/editorial/about-second-chance.jpg',
    width: 498,
    height: 739,
    alt: 'A person in a Kellum’s hoodie standing on a flat roof beneath a bright sky.',
  },
  about: wide(
    '/media/editorial/about.svg',
    'A completed kitchen renovation with custom cabinetry and pendant lighting.',
  ),
  process: landscape(
    '/media/editorial/process.svg',
    'A finished basement with recessed lighting, built-in cabinetry and new flooring.',
  ),
  serviceArea: landscape(
    '/media/editorial/service-area.svg',
    'A rebuilt rear deck with new railings and decking boards.',
  ),
  cta: wide(
    '/media/editorial/cta.svg',
    'A renovated living space with large windows and refinished floors.',
  ),
  reviews: {
    src: '/media/editorial/reviews-1.png',
    width: 1448,
    height: 1086,
    alt: 'A person looking at a finished front porch and brick home exterior.',
  },
  contact: {
    src: '/media/editorial/contact-1.png',
    width: 1448,
    height: 1086,
    alt: 'A Kellum’s representative greeting a homeowner at the front door.',
  },
} as const;

/** Cover art per service slug. Falls back to null when a slug has no artwork. */
const SERVICE_ALT: Record<string, string> = {
  'kitchen-remodeling': 'A remodelled kitchen with new cabinetry, stone counters and an island.',
  'bathroom-renovations': 'A renovated bathroom with a tiled shower enclosure and a new vanity.',
  'basement-finishing': 'A finished basement with recessed lighting and built-in storage.',
  'interior-renovations': 'A renovated living room with a rebuilt fireplace and new flooring.',
  flooring: 'New hardwood flooring installed wall to wall with fresh baseboard.',
  'drywall-and-painting': 'Smooth new drywall and freshly painted trim in a renovated room.',
  'carpentry-and-trim': 'Custom wall panelling and painted trim carpentry.',
  'doors-and-windows': 'New windows and trim in a renovated living space.',
  'decks-and-exteriors': 'A rebuilt deck with new boards, railings and balusters.',
  'repair-and-restoration': 'A repaired and refinished laundry area with new cabinetry.',
  'rental-property-turnovers': 'A turned-over rental unit with new flooring and clean finishes.',
  'custom-renovation-projects': 'A custom renovation with bespoke cabinetry and detailing.',
};

export function serviceImage(slug: string): ImageAsset | null {
  const alt = SERVICE_ALT[slug];
  if (!alt) return null;
  return landscape(`/media/services/${slug}.svg`, alt);
}

/** Builds the image set for a seeded sample project. */
export function projectImage(
  slug: string,
  file: string,
  alt: string,
  shape: 'landscape' | 'portrait' = 'landscape',
): ImageAsset {
  const src = `/media/projects/${slug}/${file}.svg`;
  return shape === 'portrait' ? portrait(src, alt) : landscape(src, alt);
}

/** Neutral fallback used when a record has no artwork at all. */
export const missingImage: ImageAsset = {
  src: '/media/editorial/story.svg',
  alt: '',
  ...LANDSCAPE,
};
