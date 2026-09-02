import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Header } from './Header';

vi.mock('@/lib/hooks/useStickyHeader', () => ({
  useStickyHeader: () => ({ isScrolled: false, isHidden: false }),
}));
vi.mock('@/lib/hooks/useScrollLock', () => ({ useScrollLock: () => undefined }));
vi.mock('@/lib/siteContentContext', () => ({
  useSiteContent: () => ({
    phone: { href: 'tel:+15136200130', display: '513-620-0130' },
    site: {
      legalName: 'Kellum’s Second Chance Renovations',
      tagline: 'Your home deserves a second chance.',
    },
  }),
}));

describe('Header mobile menu', () => {
  it('uses the exact primary navigation order', async () => {
    render(<MemoryRouter><Header /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const nav = screen.getByRole('navigation', { name: 'Site' });
    expect(within(nav).getAllByRole('link').map((link) => link.textContent?.replace(/^\d+/, '').trim())).toEqual([
      'HomeStart here','AboutWho you would be working with','ServicesWhat we take on',
      'GalleryExterior work, up close','ProjectsSecond chances we have built','ReviewsWhat homeowners say',
      'FAQStraight answers','Work With UsBuild what comes next','BookingsRequest a time',
      "ContactLet's talk about your exterior",
    ]);
  });

  it('keeps navigation content and action links in separate regions', async () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));

    const nav = screen.getByRole('navigation', { name: 'Site' });
    const drawer = nav.parentElement;
    expect(drawer).not.toBeNull();
    expect(nav).toContainElement(screen.getByText('Your home deserves a second chance.'));

    const requestLink = within(drawer!).getByRole('link', { name: 'Request an Estimate' });
    const phoneLink = within(drawer!).getByRole('link', { name: /513-620-0130/ });
    expect(nav).not.toContainElement(requestLink);
    expect(nav).not.toContainElement(phoneLink);
  });
});
