import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectMediaManager } from './ProjectMediaManager';
import type { AdminProjectImage } from '@/lib/api/adminTypes';

/**
 * The photo manager.
 *
 * The two behaviours worth locking down are the ones a business owner would
 * never think to check: that setting a cover really replaces the old one, and
 * that pairing a before with an after never requires typing a pair key.
 */

const mocks = vi.hoisted(() => ({
  setProjectCoverImage: vi.fn(() => Promise.resolve()),
  saveBeforeAfterPair: vi.fn(() => Promise.resolve([])),
  removeBeforeAfterPair: vi.fn(() => Promise.resolve()),
  reorderBeforeAfterPairs: vi.fn(() => Promise.resolve()),
  reorderProjectImages: vi.fn(() => Promise.resolve()),
  deleteProjectImage: vi.fn(() => Promise.resolve()),
  updateProjectImage: vi.fn(() => Promise.resolve()),
  uploadProjectImage: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/api/admin', () => mocks);

function image(overrides: Partial<AdminProjectImage> = {}): AdminProjectImage {
  return {
    id: 1,
    src: '/uploads/projects/1/a.png',
    width: 1200,
    height: 800,
    alt: 'A finished kitchen',
    kind: 'Gallery',
    caption: null,
    displayOrder: 0,
    pairKey: null,
    isUploaded: true,
    fileSizeBytes: 12345,
    ...overrides,
  };
}

function renderManager(images: readonly AdminProjectImage[]) {
  const onChanged = vi.fn();
  const onReload = vi.fn();
  render(
    <ProjectMediaManager projectId={7} images={images} onChanged={onChanged} onReload={onReload} />,
  );
  return { onChanged, onReload };
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockClear();
});

describe('cover selection', () => {
  it('promotes the chosen photograph', async () => {
    renderManager([
      image({ id: 1, alt: 'The original cover', kind: 'Cover' }),
      image({ id: 2, alt: 'A gallery shot', displayOrder: 1 }),
    ]);

    await userEvent.click(screen.getByRole('button', { name: /use A gallery shot as the cover/i }));

    expect(mocks.setProjectCoverImage).toHaveBeenCalledWith(7, 2);
  });

  it('does not offer to re-cover the photograph that is already the cover', () => {
    renderManager([image({ id: 1, alt: 'The original cover', kind: 'Cover' })]);

    expect(screen.getByRole('button', { name: /use The original cover as the cover/i })).toBeDisabled();
  });

  it('warns when a project has photographs but none is the cover', () => {
    renderManager([image({ id: 1, alt: 'A gallery shot' })]);

    expect(screen.getByText(/No cover photograph/i)).toBeInTheDocument();
  });
});

describe('before and after pairing', () => {
  it('offers each side only photographs of the matching kind', () => {
    renderManager([
      image({ id: 1, alt: 'The old kitchen', kind: 'Before' }),
      image({ id: 2, alt: 'The new kitchen', kind: 'After' }),
      image({ id: 3, alt: 'A detail shot' }),
    ]);

    const before = screen.getByRole('combobox', { name: 'Before' });
    const after = screen.getByRole('combobox', { name: 'After' });

    expect(before).toHaveTextContent('The old kitchen');
    expect(before).not.toHaveTextContent('The new kitchen');
    expect(after).toHaveTextContent('The new kitchen');
    // A gallery photograph belongs to neither side.
    expect(before).not.toHaveTextContent('A detail shot');
    expect(after).not.toHaveTextContent('A detail shot');
  });

  it('pairs two photographs without anybody typing a key', async () => {
    renderManager([
      image({ id: 1, alt: 'The old kitchen', kind: 'Before' }),
      image({ id: 2, alt: 'The new kitchen', kind: 'After' }),
    ]);

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Before' }), '1');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'After' }), '2');
    await userEvent.click(screen.getByRole('button', { name: /match these two/i }));

    expect(mocks.saveBeforeAfterPair).toHaveBeenCalledWith(7, {
      beforeImageId: 1,
      afterImageId: 2,
      // The server generates it. Nothing in the UI asks for one.
      pairKey: null,
    });
  });

  it('refuses to pair when only one side is chosen', async () => {
    renderManager([
      image({ id: 1, alt: 'The old kitchen', kind: 'Before' }),
      image({ id: 2, alt: 'The new kitchen', kind: 'After' }),
    ]);

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Before' }), '1');
    await userEvent.click(screen.getByRole('button', { name: /match these two/i }));

    expect(mocks.saveBeforeAfterPair).not.toHaveBeenCalled();
    expect(screen.getByText(/choose both a before and an after/i)).toBeInTheDocument();
  });

  it('drops an already-paired photograph from the choices', () => {
    renderManager([
      image({ id: 1, alt: 'The old kitchen', kind: 'Before', pairKey: 'pair-abc' }),
      image({ id: 2, alt: 'The new kitchen', kind: 'After', pairKey: 'pair-abc' }),
      image({ id: 3, alt: 'A second before', kind: 'Before' }),
    ]);

    const before = screen.getByRole('combobox', { name: 'Before' });
    expect(before).toHaveTextContent('A second before');
    expect(before).not.toHaveTextContent('The old kitchen');
  });

  it('shows an existing pair with its position, and can reorder it', async () => {
    renderManager([
      image({ id: 1, alt: 'Before one', kind: 'Before', pairKey: 'pair-a' }),
      image({ id: 2, alt: 'After one', kind: 'After', pairKey: 'pair-a', displayOrder: 1 }),
      image({ id: 3, alt: 'Before two', kind: 'Before', pairKey: 'pair-b', displayOrder: 2 }),
      image({ id: 4, alt: 'After two', kind: 'After', pairKey: 'pair-b', displayOrder: 3 }),
    ]);

    expect(screen.getByText('Transformation 1 of 2')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /move transformation 2 earlier/i }));

    expect(mocks.reorderBeforeAfterPairs).toHaveBeenCalledWith(7, ['pair-b', 'pair-a']);
  });

  it('replaces one half of a pair in place, keeping its position', async () => {
    renderManager([
      image({ id: 1, alt: 'Before one', kind: 'Before', pairKey: 'pair-a' }),
      image({ id: 2, alt: 'After one', kind: 'After', pairKey: 'pair-a', displayOrder: 1 }),
      image({ id: 3, alt: 'A better after', kind: 'After', displayOrder: 2 }),
    ]);

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: /after photograph for transformation 1/i }),
      '3',
    );

    // The EXISTING key is passed, so the pair is updated rather than a second
    // one being created and the transformation jumping to the end.
    expect(mocks.saveBeforeAfterPair).toHaveBeenCalledWith(7, {
      pairKey: 'pair-a',
      beforeImageId: 1,
      afterImageId: 3,
    });
  });

  it('takes one side out without touching the other', async () => {
    renderManager([
      image({ id: 1, alt: 'Before one', kind: 'Before', pairKey: 'pair-a' }),
      image({ id: 2, alt: 'After one', kind: 'After', pairKey: 'pair-a', displayOrder: 1 }),
    ]);

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: /after photograph for transformation 1/i }),
      '',
    );

    expect(mocks.saveBeforeAfterPair).toHaveBeenCalledWith(7, {
      pairKey: 'pair-a',
      beforeImageId: 1,
      afterImageId: null,
    });
    expect(mocks.deleteProjectImage).not.toHaveBeenCalled();
  });

  it('does not offer a photograph that belongs to a different pair', () => {
    renderManager([
      image({ id: 1, alt: 'Before one', kind: 'Before', pairKey: 'pair-a' }),
      image({ id: 2, alt: 'After one', kind: 'After', pairKey: 'pair-a', displayOrder: 1 }),
      image({ id: 3, alt: 'Before two', kind: 'Before', pairKey: 'pair-b', displayOrder: 2 }),
      image({ id: 4, alt: 'After two', kind: 'After', pairKey: 'pair-b', displayOrder: 3 }),
    ]);

    const picker = screen.getByRole('combobox', { name: /after photograph for transformation 1/i });

    expect(picker).toHaveTextContent('After one');
    // Stealing it would silently break the other transformation.
    expect(picker).not.toHaveTextContent('After two');
  });

  it('separates a pair without deleting either photograph', async () => {
    renderManager([
      image({ id: 1, alt: 'Before one', kind: 'Before', pairKey: 'pair-a' }),
      image({ id: 2, alt: 'After one', kind: 'After', pairKey: 'pair-a', displayOrder: 1 }),
    ]);

    await userEvent.click(screen.getByRole('button', { name: /separate/i }));

    expect(mocks.removeBeforeAfterPair).toHaveBeenCalledWith(7, 'pair-a');
    expect(mocks.deleteProjectImage).not.toHaveBeenCalled();
  });
});

describe('upload validation', () => {
  it('refuses a file the server would reject, before uploading it', async () => {
    renderManager([]);

    const input = screen.getByLabelText(/add a photograph/i) as HTMLInputElement;
    const heic = new File([new Uint8Array([1, 2, 3])], 'IMG_0042.HEIC', { type: 'image/heic' });

    /*
     * fireEvent rather than userEvent.upload, on purpose. userEvent honours the
     * `accept` attribute and would drop the file before the handler ever ran —
     * but `accept` is a browser HINT, not enforcement, and a file picked
     * through "All files" reaches onChange exactly like this.
     */
    Object.defineProperty(input, 'files', { value: [heic], configurable: true });
    fireEvent.change(input);

    expect(mocks.uploadProjectImage).not.toHaveBeenCalled();
    expect(screen.getByText(/that file type is not supported/i)).toBeInTheDocument();
  });

  it('will not upload a photograph with no description', async () => {
    renderManager([]);

    const input = screen.getByLabelText(/add a photograph/i);
    const png = new File([new Uint8Array([1, 2, 3])], 'kitchen.png', { type: 'image/png' });

    await userEvent.upload(input, png);
    await userEvent.click(screen.getByRole('button', { name: /^upload$/i }));

    // Alt text is what a screen reader announces; an empty one is not an option.
    expect(mocks.uploadProjectImage).not.toHaveBeenCalled();
    expect(
      screen.getByText(/describe the photograph so people using a screen reader/i),
    ).toBeInTheDocument();
  });
});

describe('ordering', () => {
  it('moves a gallery photograph and saves the new order', async () => {
    renderManager([
      image({ id: 1, alt: 'First', displayOrder: 0 }),
      image({ id: 2, alt: 'Second', displayOrder: 1 }),
    ]);

    await userEvent.click(screen.getByRole('button', { name: /move Second earlier/i }));

    expect(mocks.reorderProjectImages).toHaveBeenCalledWith(7, [2, 1]);
  });

  it('does not offer to move the first photograph up', () => {
    renderManager([
      image({ id: 1, alt: 'First', displayOrder: 0 }),
      image({ id: 2, alt: 'Second', displayOrder: 1 }),
    ]);

    expect(screen.getByRole('button', { name: /move First earlier/i })).toBeDisabled();
  });
});
