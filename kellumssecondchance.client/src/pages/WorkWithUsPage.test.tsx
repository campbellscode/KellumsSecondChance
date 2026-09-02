import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import WorkWithUsPage from './WorkWithUsPage';
import { primaryNav } from '@/content/navigation';

vi.mock('@/lib/siteContentContext', () => ({
  useSiteContent: () => ({ site: { legalName: "Kellum’s Second Chance Renovations", siteUrl: 'https://example.test', ogImagePath: null } }),
}));

describe('Work With Us', () => {
  it('renders a general work invitation with required contact fields and no sensitive-history inputs', () => {
    render(<MemoryRouter><WorkWithUsPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Build something better.' })).toBeInTheDocument();
    expect(screen.getByLabelText('First name')).toBeRequired();
    expect(screen.getByLabelText('Email')).toBeRequired();
    expect(screen.getByLabelText('What type of work interests you?')).toBeRequired();
    for (const term of ['criminal', 'conviction', 'incarceration', 'probation', 'parole', 'disability', 'medical'])
      expect(screen.queryByLabelText(new RegExp(term, 'i'))).not.toBeInTheDocument();
  });

  it('is exposed in primary navigation while estimate conversion remains outside the nav list', () => {
    expect(primaryNav).toContainEqual(expect.objectContaining({ label: 'Work With Us', to: '/work-with-us' }));
    expect(primaryNav).not.toContainEqual(expect.objectContaining({ to: '/request-estimate' }));
  });
});
