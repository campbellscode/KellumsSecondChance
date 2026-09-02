import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ServiceAreaPage from './ServiceAreaPage';

vi.mock('@/lib/api/endpoints', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/endpoints')>()),
  getServiceAreas: vi.fn().mockResolvedValue([
    { id: 1, name: 'Cincinnati, OH', kind: 'City', stateOrRegion: 'OH', postalCodes: [], isPrimary: true, note: 'Our primary service area is Cincinnati, Ohio.', displayOrder: 1, isSampleContent: false },
    { id: 2, name: 'Hamilton County', kind: 'County', stateOrRegion: 'OH', postalCodes: [], isPrimary: true, note: null, displayOrder: 2, isSampleContent: false },
    { id: 3, name: 'Butler County', kind: 'County', stateOrRegion: 'OH', postalCodes: [], isPrimary: true, note: null, displayOrder: 3, isSampleContent: false },
    { id: 4, name: 'Clermont County', kind: 'County', stateOrRegion: 'OH', postalCodes: [], isPrimary: true, note: null, displayOrder: 4, isSampleContent: false },
    { id: 5, name: 'Warren County', kind: 'County', stateOrRegion: 'OH', postalCodes: [], isPrimary: true, note: null, displayOrder: 5, isSampleContent: false },
    { id: 6, name: 'Blue Ash', kind: 'City', stateOrRegion: 'OH', postalCodes: [], isPrimary: false, note: null, displayOrder: 6, isSampleContent: false },
    { id: 7, name: 'Milford', kind: 'City', stateOrRegion: 'OH', postalCodes: [], isPrimary: false, note: null, displayOrder: 7, isSampleContent: false },
  ]),
}));

vi.mock('@/lib/siteContentContext', () => ({
  useSiteContent: () => ({
    content: { serviceAreaSummary: 'Serving homeowners in Cincinnati, Ohio.' },
    site: {
      legalName: "Kellum’s Second Chance Renovations",
      shortName: "Kellum’s",
      tagline: 'Second chances are what we build.',
      elevatorPitch: 'Exterior renovation in Cincinnati.',
      siteUrl: 'https://kellumssecondchance.com',
      phoneE164: '+15136200130',
      email: 'secondchancerenov@gmail.com',
      addressLine1: null,
      addressLine2: null,
      addressLocality: 'Cincinnati',
      addressRegion: 'OH',
      addressPostalCode: '45236',
      foundedYear: null,
      ogImagePath: null,
      googleReviewUrl: null,
      socialHrefs: [],
    },
  }),
}));

describe('Service Area page map', () => {
  it('embeds a lazy Google map for Cincinnati without inventing a street address', async () => {
    render(<MemoryRouter><ServiceAreaPage /></MemoryRouter>);

    const map = screen.getByTitle('Google Map showing Cincinnati, Ohio service area');
    expect(map).toHaveAttribute(
      'src',
      'https://www.google.com/maps?q=Cincinnati%2C%20OH&z=12&output=embed',
    );
    expect(map).toHaveAttribute('loading', 'lazy');
    expect(map).toHaveAttribute('referrerpolicy', 'no-referrer-when-downgrade');
    expect(map.getAttribute('src')).not.toMatch(/45236|street|road|avenue/i);
    expect(await screen.findByText('Cincinnati, OH')).toBeInTheDocument();
    expect(screen.getByText(/Hamilton County · Butler County · Clermont County · Warren County/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nearby communities' })).toBeInTheDocument();
    expect(screen.getByText('Blue Ash · Milford')).toBeInTheDocument();
    expect(screen.queryByText(/neighbour/i)).not.toBeInTheDocument();
  });
});
