import type { ServiceArea } from '@/lib/api/types';

/**
 * ============================================================================
 *  SAMPLE SERVICE AREA — PLACEHOLDER GEOGRAPHY
 * ============================================================================
 *
 *  ⚠ These are NOT confirmed service areas. Kellum's has not supplied its
 *    coverage yet, so these entries use deliberately generic names and are all
 *    flagged `isSampleContent: true`. The Service Area page labels them.
 *
 *  Replace with real cities, counties and postal codes before launch — the
 *  page, the footer and the LocalBusiness structured data all read from here.
 * ============================================================================
 */
export const sampleServiceAreas: readonly ServiceArea[] = [
  {
    id: 1,
    name: 'Primary service city',
    kind: 'City',
    stateOrRegion: null,
    postalCodes: [],
    isPrimary: true,
    note: 'Placeholder — replace with the main city Kellum’s serves.',
    displayOrder: 1,
    isSampleContent: true,
  },
  {
    id: 2,
    name: 'Surrounding county',
    kind: 'County',
    stateOrRegion: null,
    postalCodes: [],
    isPrimary: true,
    note: 'Placeholder — replace with the county or counties covered.',
    displayOrder: 2,
    isSampleContent: true,
  },
  {
    id: 3,
    name: 'Neighbouring towns',
    kind: 'Region',
    stateOrRegion: null,
    postalCodes: [],
    isPrimary: false,
    note: 'Placeholder — list the surrounding towns Kellum’s travels to.',
    displayOrder: 3,
    isSampleContent: true,
  },
];

