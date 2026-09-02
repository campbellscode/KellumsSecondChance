import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import GalleryPage from './GalleryPage';

vi.mock('@/lib/siteContentContext',()=>({useSiteContent:()=>({site:{legalName:"Kellum’s Second Chance Renovations",siteUrl:'https://example.test',ogImagePath:null}})}));

const photos = Array.from({ length: 3 }, (_, index) => ({ id: index + 1, imageUrl: `/uploads/gallery/${index + 1}.jpg`, altText: `Gallery photo ${index + 1}`, caption: index === 1 ? 'A detail' : null, width: 1200, height: 800, displayOrder: index + 1 }));

describe('Gallery page',()=>{
  it('loads API media and provides keyboard-accessible lightbox navigation',async()=>{
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(photos), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    render(<MemoryRouter><GalleryPage/></MemoryRouter>);
    expect(screen.getByText('Loading gallery')).toBeInTheDocument();
    const openers=await screen.findAllByRole('button',{name:/open gallery image/i});
    expect(openers).toHaveLength(3);
    expect(screen.getByAltText('Gallery photo 1')).toHaveAttribute('src','/uploads/gallery/1.jpg');
    expect(document.body.textContent).not.toMatch(/kitchen|bathroom|basement|interior renovation/i);
    await userEvent.click(openers[0]);
    expect(screen.getByRole('dialog',{name:/gallery image 1 of 3/i})).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button',{name:'Next image'}));
    expect(screen.getByRole('dialog',{name:/gallery image 2 of 3/i})).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button',{name:'Previous image'}));
    expect(screen.getByRole('dialog',{name:/gallery image 1 of 3/i})).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(openers[0]).toHaveFocus());
  });

  it('distinguishes empty content from an API failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const { unmount } = render(<MemoryRouter><GalleryPage/></MemoryRouter>);
    expect(await screen.findByText('Gallery photographs are coming soon')).toBeInTheDocument(); unmount();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{}', { status: 500, headers: { 'Content-Type': 'application/json' } }));
    render(<MemoryRouter><GalleryPage/></MemoryRouter>);
    expect(await screen.findByText('The gallery could not be loaded')).toBeInTheDocument();
  });
});
