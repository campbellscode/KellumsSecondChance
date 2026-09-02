import type { ServiceArea, ServiceAreaKind } from '@/lib/api/types';

/** Approved Ohio service geography used when the API is unavailable. */
const entries: readonly [name: string, kind: ServiceAreaKind, isPrimary: boolean, note?: string][] = [
  ['Cincinnati, OH', 'City', true, 'Our primary service area is Cincinnati, Ohio.'],
  ['Hamilton County', 'County', true],
  ['Butler County', 'County', true],
  ['Clermont County', 'County', true],
  ['Warren County', 'County', true],
  ['Blue Ash', 'City', false],
  ['Norwood', 'City', false],
  ['Madeira', 'City', false],
  ['Montgomery', 'City', false],
  ['Sharonville', 'City', false],
  ['Loveland', 'City', false],
  ['Mason', 'City', false],
  ['Fairfield', 'City', false],
  ['Milford', 'City', false],
];

export const sampleServiceAreas: readonly ServiceArea[] = entries.map(
  ([name, kind, isPrimary, note], index) => ({
    id: index + 1,
    name,
    kind,
    stateOrRegion: 'OH',
    postalCodes: [],
    isPrimary,
    note: note ?? null,
    displayOrder: index + 1,
    isSampleContent: false,
  }),
);
