import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminEstimateRequestDetailPage from './AdminEstimateRequestDetailPage';
import { ApiError } from '@/lib/api/client';
import type { AdminEstimateRequestDetail } from '@/lib/api/adminTypes';

/**
 * The lead screen.
 *
 * This is where a renovation business spends its time, so the tests are the
 * things somebody does in the first ten seconds: call the customer, move the
 * lead on, write down what was said.
 */

const mocks = vi.hoisted(() => ({
  getEstimateRequest: vi.fn(),
  changeEstimateRequestStatus: vi.fn(() => Promise.resolve()),
  addEstimateRequestNote: vi.fn(() => Promise.resolve()),
  deleteEstimateRequestNote: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/api/admin', () => mocks);

function detail(overrides: Partial<AdminEstimateRequestDetail['request']> = {}): AdminEstimateRequestDetail {
  return {
    request: {
      id: 4,
      reference: 'KSC-AB12C',
      firstName: 'Dana',
      lastName: 'Okonkwo',
      email: 'dana@example.com',
      phone: '(555) 010-2233',
      projectTypes: ['kitchen-remodeling'],
      propertyType: 'SingleFamily',
      addressLine: '12 Maple Street',
      city: 'Example City',
      postalCode: '12345',
      timeline: 'OneToThreeMonths',
      budgetRange: 'From15kTo35k',
      description: 'Our kitchen is from the eighties.',
      preferredContactMethod: 'Email',
      referralSource: 'Search',
      status: 'New',
      internalNotes: null,
      createdAtUtc: new Date().toISOString(),
      updatedAtUtc: null,
      ...overrides,
    },
    notes: [],
    history: [],
    rowVersion: 'AAAAAAAAB9E=',
  };
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/admin/estimate-requests/4']}>
      <Routes>
        <Route path="/admin/estimate-requests/:id" element={<AdminEstimateRequestDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockClear();
  mocks.getEstimateRequest.mockResolvedValue(detail());
});

describe('reaching the customer', () => {
  it('offers a tap-to-call link with the digits cleaned up', async () => {
    renderPage();

    const call = await screen.findByRole('link', { name: /call \(555\) 010-2233/i });
    expect(call).toHaveAttribute('href', 'tel:5550102233');
  });

  it('offers an email link carrying the reference in the subject', async () => {
    renderPage();

    const email = await screen.findByRole('link', { name: /^email$/i });
    expect(email.getAttribute('href')).toContain('mailto:dana@example.com');
    expect(email.getAttribute('href')).toContain('KSC-AB12C');
  });

  it('says plainly when there is no phone number rather than showing an empty link', async () => {
    mocks.getEstimateRequest.mockResolvedValue(detail({ phone: null }));
    renderPage();

    expect(await screen.findByText(/they did not leave a number/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^call/i })).not.toBeInTheDocument();
  });
});

describe('moving a lead along', () => {
  it('offers the obvious next step as a single button', async () => {
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: /mark as contacted/i }));

    expect(mocks.changeEstimateRequestStatus).toHaveBeenCalledWith(4, 'Contacted', 'AAAAAAAAB9E=');
  });

  it('sends the concurrency token so a colleague’s save is not overwritten', async () => {
    renderPage();

    await userEvent.selectOptions(
      await screen.findByRole('combobox', { name: /or move it to/i }),
      'Won',
    );

    expect(mocks.changeEstimateRequestStatus).toHaveBeenCalledWith(4, 'Won', 'AAAAAAAAB9E=');
  });

  it('explains a conflict instead of showing a raw failure', async () => {
    // A real ApiError: the page branches on `instanceof`, so a look-alike
    // would take the generic path and the test would prove nothing.
    mocks.changeEstimateRequestStatus.mockRejectedValueOnce(
      new ApiError('Conflict', 409, null),
    );
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: /mark as contacted/i }));

    await waitFor(() =>
      expect(screen.getByText(/somebody else changed this request/i)).toBeInTheDocument(),
    );
  });
});

describe('archiving', () => {
  it('asks before archiving, and says nothing is deleted', async () => {
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: /archive this request/i }));

    expect(screen.getByText(/nothing is deleted/i)).toBeInTheDocument();
    expect(mocks.changeEstimateRequestStatus).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /archive it/i }));
    expect(mocks.changeEstimateRequestStatus).toHaveBeenCalledWith(4, 'Archived', 'AAAAAAAAB9E=');
  });

  it('offers to bring an archived lead back', async () => {
    mocks.getEstimateRequest.mockResolvedValue(detail({ status: 'Archived' }));
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: /bring it back/i }));

    expect(mocks.changeEstimateRequestStatus).toHaveBeenCalledWith(4, 'New', 'AAAAAAAAB9E=');
  });

  it('never offers to delete a lead', async () => {
    renderPage();
    await screen.findByRole('button', { name: /archive this request/i });

    // §39: an enquiry somebody took the time to send is archived, not deleted.
    expect(screen.queryByRole('button', { name: /delete this request/i })).not.toBeInTheDocument();
  });
});

describe('notes', () => {
  it('records a note against the lead', async () => {
    renderPage();

    const box = await screen.findByLabelText(/add a note/i);
    await userEvent.type(box, 'Called at 2pm, wants it before the holidays.');
    await userEvent.click(screen.getByRole('button', { name: /^add note$/i }));

    expect(mocks.addEstimateRequestNote).toHaveBeenCalledWith(
      4,
      'Called at 2pm, wants it before the holidays.',
    );
  });

  it('will not add an empty note', async () => {
    renderPage();
    await screen.findByLabelText(/add a note/i);

    expect(screen.getByRole('button', { name: /^add note$/i })).toBeDisabled();
  });

  it('shows a pre-journal note without claiming a date for it', async () => {
    mocks.getEstimateRequest.mockResolvedValue(
      detail({ internalNotes: 'Something written before notes were dated.' }),
    );
    renderPage();

    expect(await screen.findByText(/something written before notes were dated/i)).toBeInTheDocument();
    expect(screen.getByText(/recorded before notes were dated/i)).toBeInTheDocument();
  });
});

describe('what the customer told us', () => {
  it('shows the enquiry in plain language, not enum names', async () => {
    renderPage();

    expect(await screen.findByText('Single-family home')).toBeInTheDocument();
    expect(screen.getByText('One to three months')).toBeInTheDocument();
    expect(screen.getByText('$15,000 – $35,000')).toBeInTheDocument();
    // "Prefers" is the field; "Email" alone also matches the contact-details row.
    expect(screen.getByText('Prefers').closest('div')).toHaveTextContent('Email');

    expect(screen.queryByText('SingleFamily')).not.toBeInTheDocument();
    expect(screen.queryByText('From15kTo35k')).not.toBeInTheDocument();
  });

  it('marks an unsupplied detail as not given rather than blank', async () => {
    mocks.getEstimateRequest.mockResolvedValue(detail({ referralSource: null, city: null }));
    renderPage();

    await screen.findByText('Our kitchen is from the eighties.');
    expect(screen.getAllByText(/not given/i).length).toBeGreaterThan(0);
  });
});
