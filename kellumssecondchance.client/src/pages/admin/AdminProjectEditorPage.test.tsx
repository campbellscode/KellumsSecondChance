import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminProjectEditorPage from './AdminProjectEditorPage';
import { ApiError } from '@/lib/api/client';
import type { AdminProject, AdminService } from '@/lib/api/adminTypes';

/**
 * The project editor.
 *
 * The rules worth pinning down are the ones with consequences a business owner
 * cannot see: that a published URL does not move when a heading is reworded,
 * that a server rejection lands on the field that caused it, and that a
 * switched-off service cannot be attached to new work.
 */

const mocks = vi.hoisted(() => ({
  getAdminProject: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(() => Promise.resolve()),
  listAdminServices: vi.fn(),
  uploadProjectImage: vi.fn(),
  updateProjectImage: vi.fn(),
  deleteProjectImage: vi.fn(),
  reorderProjectImages: vi.fn(),
  setProjectCoverImage: vi.fn(),
  saveBeforeAfterPair: vi.fn(),
  removeBeforeAfterPair: vi.fn(),
  reorderBeforeAfterPairs: vi.fn(),
}));

vi.mock('@/lib/api/admin', () => mocks);

function project(overrides: Partial<AdminProject> = {}): AdminProject {
  return {
    id: 5,
    slug: 'maple-street-kitchen',
    title: 'Maple Street Kitchen',
    categoryName: 'Kitchen Remodeling',
    categorySlug: 'kitchen-remodeling',
    location: 'Example City',
    summary: 'A tired galley kitchen opened into the dining room.',
    challenge: 'The layout was wrong.',
    vision: 'One continuous run.',
    transformation: 'We rebuilt it.',
    outcome: null,
    completedOn: null,
    durationLabel: null,
    propertyType: null,
    highlights: [],
    serviceIds: [],
    isFeatured: false,
    isActive: true,
    isSampleContent: false,
    displayOrder: 0,
    metaTitle: null,
    metaDescription: null,
    images: [],
    createdAtUtc: new Date().toISOString(),
    updatedAtUtc: null,
    rowVersion: 'AAAAAAAAB9E=',
    ...overrides,
  };
}

function service(overrides: Partial<AdminService> = {}): AdminService {
  return {
    id: 1,
    slug: 'kitchen-remodeling',
    name: 'Kitchen Remodeling',
    tagline: 'Kitchens',
    summary: 'Kitchen renovation.',
    icon: 'chef-hat',
    headline: 'Kitchens',
    introduction: 'We renovate kitchens.',
    includes: [],
    bestFor: [],
    considerations: [],
    image: null,
    isFeatured: false,
    isActive: true,
    displayOrder: 0,
    metaTitle: null,
    metaDescription: null,
    linkedProjectCount: 0,
    updatedAtUtc: null,
    rowVersion: null,
    ...overrides,
  };
}

function renderEditor(path = '/admin/projects/5') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/projects/new" element={<AdminProjectEditorPage />} />
        <Route path="/admin/projects/:id" element={<AdminProjectEditorPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.getAdminProject.mockResolvedValue(project());
  mocks.listAdminServices.mockResolvedValue([service()]);
  mocks.updateProject.mockImplementation((_id: number, body: unknown) =>
    Promise.resolve({ ...project(), ...(body as object) }),
  );
  mocks.createProject.mockResolvedValue(project({ id: 9 }));
});

describe('creating a project', () => {
  it('shows the address it will use, derived from the title', async () => {
    renderEditor('/admin/projects/new');

    await userEvent.type(await screen.findByLabelText(/project title/i), 'Oak Avenue Bathroom');

    expect(screen.getByText('/projects/oak-avenue-bathroom')).toBeInTheDocument();
  });

  it('starts a new project as a draft, not live on the website', async () => {
    renderEditor('/admin/projects/new');

    const publish = await screen.findByRole('checkbox', { name: /show this project on the website/i });
    expect(publish).not.toBeChecked();
  });

  it('says photographs come after the project exists', async () => {
    renderEditor('/admin/projects/new');

    expect(await screen.findByText(/photographs can be added once the project exists/i)).toBeInTheDocument();
  });
});

describe('editing a project', () => {
  it('does not move the published address when the heading is reworded', async () => {
    renderEditor();

    const title = await screen.findByLabelText(/project title/i);
    await userEvent.clear(title);
    await userEvent.type(title, 'A completely different heading');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(mocks.updateProject).toHaveBeenCalled());

    const body = mocks.updateProject.mock.calls[0][1] as Record<string, unknown>;
    expect(body.title).toBe('A completely different heading');
    // Omitted entirely, so the server leaves the URL where customers found it.
    expect(body).not.toHaveProperty('slug');
  });

  it('sends the address only when it is deliberately changed', async () => {
    renderEditor();

    const slug = await screen.findByLabelText(/^web address/i);
    await userEvent.clear(slug);
    await userEvent.type(slug, 'a-deliberate-new-address');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(mocks.updateProject).toHaveBeenCalled());
    expect((mocks.updateProject.mock.calls[0][1] as Record<string, unknown>).slug).toBe(
      'a-deliberate-new-address',
    );
  });

  it('warns that changing the address breaks existing links', async () => {
    renderEditor();

    expect(await screen.findByText(/moves the page/i)).toBeInTheDocument();
  });

  it('carries the concurrency token so a colleague is not overwritten', async () => {
    renderEditor();

    await userEvent.type(await screen.findByLabelText(/project title/i), '!');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(mocks.updateProject).toHaveBeenCalled());
    expect((mocks.updateProject.mock.calls[0][1] as Record<string, unknown>).rowVersion).toBe(
      'AAAAAAAAB9E=',
    );
  });
});

describe('validation', () => {
  it('puts a server rejection on the field that caused it', async () => {
    mocks.updateProject.mockRejectedValueOnce(
      new ApiError('Some of those details need another look.', 400, {
        errors: { Slug: ['That address is already used by another project.'] },
      }),
    );
    renderEditor();

    await userEvent.type(await screen.findByLabelText(/project title/i), '!');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    // Twice on purpose: once under the input, and once in the summary at the
    // top, which is how somebody finds a failure two screens further down.
    const shown = await screen.findAllByText(/that address is already used by another project/i);
    expect(shown.length).toBe(2);

    // The summary names the field in words, not as a DTO property.
    expect(screen.getByRole('button', { name: /web address/i })).toBeInTheDocument();
  });

  it('explains a save conflict in plain words', async () => {
    mocks.updateProject.mockRejectedValueOnce(new ApiError('Conflict', 409, null));
    renderEditor();

    await userEvent.type(await screen.findByLabelText(/project title/i), '!');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText(/somebody else saved this project/i)).toBeInTheDocument();
  });
});

describe('services on a project', () => {
  it('will not let a switched-off service be attached to new work', async () => {
    mocks.listAdminServices.mockResolvedValue([
      service({ id: 1, name: 'Kitchen Remodeling', isActive: true }),
      service({ id: 2, name: 'Retired Service', slug: 'retired', isActive: false }),
    ]);
    renderEditor();

    expect(await screen.findByRole('checkbox', { name: /Kitchen Remodeling/ })).toBeEnabled();
    // Attaching it would link the project to a page nobody can reach.
    expect(screen.getByRole('checkbox', { name: /Retired Service/ })).toBeDisabled();
    expect(screen.getByText(/switched off/i)).toBeInTheDocument();
  });

  it('keeps an existing link to a service that was later switched off editable', async () => {
    mocks.getAdminProject.mockResolvedValue(project({ serviceIds: [2] }));
    mocks.listAdminServices.mockResolvedValue([
      service({ id: 2, name: 'Retired Service', slug: 'retired', isActive: false }),
    ]);
    renderEditor();

    // An old project must not become uneditable because a service was retired.
    const box = await screen.findByRole('checkbox', { name: /Retired Service/ });
    expect(box).toBeChecked();
    expect(box).toBeEnabled();
  });
});

describe('example content', () => {
  it('says plainly when a project is one of the built-in demonstrations', async () => {
    mocks.getAdminProject.mockResolvedValue(project({ isSampleContent: true }));
    renderEditor();

    expect(await screen.findByText(/one of the built-in examples/i)).toBeInTheDocument();
  });

  it('does not label a real project as an example', async () => {
    renderEditor();
    await screen.findByLabelText(/project title/i);

    expect(screen.queryByText(/one of the built-in examples/i)).not.toBeInTheDocument();
  });
});

describe('deleting', () => {
  it('asks first, and offers switching off as the safer alternative', async () => {
    renderEditor();

    await userEvent.click(await screen.findByRole('button', { name: /delete project/i }));

    // The dialog names the project and the photograph count, so it is specific
    // about what disappears rather than generically scary.
    expect(screen.getByRole('button', { name: /delete permanently/i })).toBeInTheDocument();
    expect(mocks.deleteProject).not.toHaveBeenCalled();
    expect(screen.getByText(/switch it off above instead/i)).toBeInTheDocument();
  });
});
