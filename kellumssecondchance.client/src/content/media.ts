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
  before: wide(
    '/media/hero/hero-before.svg',
    'A dated kitchen with worn cabinets, dim lighting and a tired laminate counter.',
  ),
  after: wide(
    '/media/hero/hero-after.svg',
    'The same kitchen rebuilt: new cabinetry, stone counters, warm daylight and a finished island.',
  ),
  detail: portrait(
    '/media/hero/hero-detail.svg',
    'Close detail of newly installed wall panelling and painted trim.',
  ),
} as const;

export const editorialMedia = {
  story: landscape(
    '/media/editorial/story.svg',
    'Freshly finished wall panelling and trim carpentry in a renovated hallway.',
  ),
  storyPortrait: portrait(
    '/media/editorial/story-portrait.svg',
    'A renovated living room with a rebuilt fireplace surround and new hardwood floors.',
  ),
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
  reviews: landscape(
    '/media/editorial/reviews.svg',
    'A remodelled bathroom with a tiled walk-in shower and a floating vanity.',
  ),
  contact: landscape(
    '/media/editorial/contact.svg',
    'Newly installed hardwood flooring running toward a freshly painted wall.',
  ),
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
