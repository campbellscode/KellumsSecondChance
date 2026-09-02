import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import { ApiError } from '@/lib/api/client';

/**
 * The admin shell's session check.
 *
 * This check only decides what to RENDER — every /api/admin endpoint enforces
 * authorisation on the server regardless, and the backend suite proves that.
 * What matters here is that a signed-out visitor is sent to the sign-in page
 * rather than left looking at an empty console.
 */

const mocks = vi.hoisted(() => ({
  adminMe: vi.fn(),
  adminLogout: vi.fn(() => Promise.resolve()),
  antiforgeryToken: vi.fn(() => Promise.resolve('token')),
  clearAntiforgeryToken: vi.fn(),
}));

vi.mock('@/lib/api/endpoints', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/endpoints')>()),
  adminMe: mocks.adminMe,
  adminLogout: mocks.adminLogout,
}));

vi.mock('@/lib/api/admin', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/admin')>()),
  antiforgeryToken: mocks.antiforgeryToken,
  clearAntiforgeryToken: mocks.clearAntiforgeryToken,
}));

function renderShell() {
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<p>The console</p>} />
        </Route>
        <Route path="/admin/login" element={<p>Sign in to continue</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.adminMe.mockReset();
  mocks.adminLogout.mockClear();
});

describe('the session check', () => {
  it('sends a signed-out visitor to the sign-in page', async () => {
    mocks.adminMe.mockRejectedValue(new ApiError('You do not have access to that.', 401, null));

    renderShell();

    expect(await screen.findByText('Sign in to continue')).toBeInTheDocument();
    expect(screen.queryByText('The console')).not.toBeInTheDocument();
  });

  it('treats a forbidden response the same way', async () => {
    mocks.adminMe.mockRejectedValue(new ApiError('You do not have access to that.', 403, null));

    renderShell();

    expect(await screen.findByText('Sign in to continue')).toBeInTheDocument();
  });

  it('renders the console for a signed-in administrator', async () => {
    mocks.adminMe.mockResolvedValue({
      email: 'sam@example.com',
      displayName: 'Sam Kellum',
      roles: ['Administrator'],
    });

    renderShell();

    expect(await screen.findByText('The console')).toBeInTheDocument();
    expect(screen.getByText('Sam Kellum')).toBeInTheDocument();
  });

  it('offers a retry when the site cannot be reached, rather than a sign-in loop', async () => {
    // A server fault is not the same as being signed out — bouncing to the
    // login page would be a lie about why the console is unavailable.
    mocks.adminMe.mockRejectedValueOnce(new ApiError('Something went wrong.', 500, null));
    mocks.adminMe.mockResolvedValueOnce({
      email: 'sam@example.com',
      displayName: 'Sam Kellum',
      roles: ['Administrator'],
    });

    renderShell();

    expect(await screen.findByText(/could not sign you in just now/i)).toBeInTheDocument();
    expect(screen.queryByText('Sign in to continue')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText('The console')).toBeInTheDocument();
  });

  it('does not tell a business owner to check that the server is running', async () => {
    mocks.adminMe.mockRejectedValue(new ApiError('Something went wrong.', 500, null));

    renderShell();

    await screen.findByText(/could not sign you in just now/i);
    expect(screen.queryByText(/admin api/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/server is running/i)).not.toBeInTheDocument();
  });
});

describe('navigation', () => {
  beforeEach(() => {
    mocks.adminMe.mockResolvedValue({
      email: 'sam@example.com',
      displayName: 'Sam Kellum',
      roles: ['Administrator'],
    });
  });

  it('names every destination the spec requires', async () => {
    renderShell();
    await screen.findByText('The console');

    /*
     * Matched on visible text and destination rather than on the computed
     * accessible name: jsdom's name computation does not resolve a label that
     * sits beside an aria-hidden <svg>, which real browsers do. The markup —
     * <a><svg aria-hidden/><span>Label</span></a> — is what carries the name.
     */
    const expected: readonly [string, string][] = [
      ['Dashboard', '/admin'],
      ['Estimate requests', '/admin/estimate-requests'],
      ['Projects', '/admin/projects'],
      ['Gallery', '/admin/gallery'],
      ['Services', '/admin/services'],
      ['Reviews', '/admin/testimonials'],
      ['Questions', '/admin/faqs'],
      ['Service areas', '/admin/service-areas'],
      ['Business details', '/admin/site-settings'],
    ];

    for (const [label, href] of expected) {
      // Two copies exist — the sidebar and the mobile drawer — which is fine.
      const matches = screen.getAllByText(label);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0]!.closest('a')).toHaveAttribute('href', href);
    }
  });

  it('gives every navigation link a text label, not an icon alone', async () => {
    renderShell();
    await screen.findByText('The console');

    const links = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('nav a[href^="/admin"]'),
    );

    expect(links.length).toBeGreaterThanOrEqual(8);
    for (const link of links) {
      expect(link.textContent?.trim()).not.toBe('');
    }
  });

  it('provides distinct shared sidebar and main-content regions', async () => {
    renderShell();
    await screen.findByText('The console');

    expect(document.querySelector('nav[aria-label="Admin sections"]')).toBeInTheDocument();
    expect(document.querySelector('main#admin-main')).toBeInTheDocument();
  });

  it('keeps View site and Sign out named at every width', async () => {
    renderShell();
    await screen.findByText('The console');

    // The labels are hidden VISUALLY below 640px, never from assistive tech.
    expect(screen.getByRole('link', { name: /view site/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('signs out and forgets the antiforgery token', async () => {
    renderShell();
    await screen.findByText('The console');

    await userEvent.click(screen.getByRole('button', { name: /sign out/i }));

    await waitFor(() => expect(mocks.adminLogout).toHaveBeenCalled());
    // Leaving a stale token behind would break the next person to sign in.
    expect(mocks.clearAntiforgeryToken).toHaveBeenCalled();
  });
});
