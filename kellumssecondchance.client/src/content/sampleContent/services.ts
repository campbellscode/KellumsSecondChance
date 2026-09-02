import type { ServiceDetail } from '@/lib/api/types';

/** Confirmed exterior service catalogue used when the API is unavailable. */
type ServiceSeed = readonly [slug: string, name: string, tagline: string, icon: string, summary: string];

const catalogue: readonly ServiceSeed[] = [
  ['roofing', 'Roofing', 'Protect the home from the top down', 'home', 'Roofing services for Cincinnati-area homes.'],
  ['siding', 'Siding', 'Renew and protect the exterior', 'panels-top-left', 'Siding services for residential exteriors.'],
  ['gutters-and-downspouts', 'Gutters & Downspouts', 'Manage water at the roofline', 'waves', 'Gutter and downspout services for residential properties.'],
  ['decks', 'Decks', 'Make outdoor space useful again', 'trees', 'Deck services for residential outdoor spaces.'],
  ['porches', 'Porches', 'Restore the welcome home', 'columns-3', 'Porch services for residential exteriors.'],
  ['windows', 'Windows', 'Exterior openings renewed', 'square', 'Window services for residential properties.'],
  ['exterior-doors', 'Exterior Doors', 'Entryways given a second chance', 'door-open', 'Exterior door services for residential properties.'],
  ['exterior-painting', 'Exterior Painting', 'A fresh finish for the outside', 'paint-roller', 'Exterior painting services for homes.'],
  ['trim-fascia-and-soffit', 'Trim, Fascia & Soffit', 'Finish and renew exterior details', 'ruler', 'Exterior trim, fascia and soffit services.'],
  ['exterior-carpentry', 'Exterior Carpentry', 'Carpentry made for the outside', 'hammer', 'Exterior carpentry services for residential properties.'],
  ['storm-damage-repair', 'Storm-Damage Repair', 'Help after exterior storm damage', 'cloud-lightning', 'Repair services for storm-damaged residential exteriors.'],
  ['rot-and-water-damage-repair', 'Rot & Water-Damage Repair', 'Address damaged exterior areas', 'droplets', 'Repair services for exterior rot and water damage.'],
  ['exterior-restoration', 'Exterior Restoration', 'Bring the outside back', 'refresh-cw', 'Exterior restoration services for residential properties.'],
  ['fences', 'Fences', 'Define and renew outdoor space', 'align-justify', 'Fence services for residential properties.'],
  ['patios', 'Patios', 'Renew the space outside', 'layout-grid', 'Patio services for residential properties.'],
  ['concrete-and-masonry', 'Concrete & Masonry', 'Solid work for outdoor spaces', 'brick-wall', 'Concrete and masonry services for residential exteriors.'],
];

export const sampleServices: readonly ServiceDetail[] = catalogue.map(
  ([slug, name, tagline, icon, summary], index) => ({
    id: index + 1, slug, name, tagline, summary, icon, image: null,
    displayOrder: index + 1,
    isFeatured: index < 3,
    headline: name,
    introduction: `Kellum’s Second Chance Renovations provides ${name.toLowerCase()} services for homeowners in Cincinnati, Ohio.`,
    includes: [name],
    bestFor: ['Homeowners planning exterior renovation, repair or restoration'],
    considerations: ['Tell us about the property and the work you have in mind so we can discuss whether the project is a fit.'],
    relatedProjectSlugs: [],
    metaTitle: `${name} in Cincinnati, OH | Kellum’s Second Chance Renovations`,
    metaDescription: `${summary} Request an estimate from Kellum’s Second Chance Renovations in Cincinnati, Ohio.`,
  }),
);

export const sampleServiceSummaries = sampleServices.map(
  ({ id, slug, name, tagline, summary, icon, image, displayOrder, isFeatured }) => ({
    id, slug, name, tagline, summary, icon, image, displayOrder, isFeatured,
  }),
);
