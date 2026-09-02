import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Seo } from './Seo';
import { runtimeIndexingDisabled } from './runtimeIndexing';

const site = {
  legalName: 'Kellum’s Second Chance Renovations',
  siteUrl: 'https://kellumssecondchance.com',
  ogImagePath: '/media/social/social-thumbnail-1.png',
};
vi.mock('@/lib/siteContentContext', () => ({ useSiteContent: () => ({ site }) }));

describe('Seo social metadata', () => {
  beforeEach(() => { document.head.querySelectorAll('meta[data-seo], link[data-seo], meta[name="robots"]').forEach((node) => node.remove()); });

  it('uses the approved default for Open Graph and Twitter cards', async () => {
    render(<Seo title="About" description="Page description" path="/about" />);
    await waitFor(() => expect(document.head.querySelector('meta[property="og:image"]')).not.toBeNull());
    const expected = 'https://kellumssecondchance.com/media/social/social-thumbnail-1.png';
    expect(document.head.querySelector('meta[property="og:image"]')).toHaveAttribute('content', expected);
    expect(document.head.querySelector('meta[name="twitter:image"]')).toHaveAttribute('content', expected);
    expect(document.head.querySelector('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
    expect(document.head.querySelector('meta[property="og:image:width"]')).toHaveAttribute('content', '1731');
    expect(document.head.querySelector('meta[property="og:image:height"]')).toHaveAttribute('content', '909');
    expect(document.head.querySelectorAll('meta[property="og:image"]')).toHaveLength(1);
    expect(document.head.querySelectorAll('meta[name="twitter:image"]')).toHaveLength(1);
  });

  it('keeps a page-specific absolute image override', async () => {
    render(<Seo title="Project" description="Project description" path="/projects/example" image="https://cdn.example.test/project.jpg" imageAlt="Project exterior" />);
    await waitFor(() => expect(document.head.querySelector('meta[property="og:image"]')).toHaveAttribute('content', 'https://cdn.example.test/project.jpg'));
    expect(document.head.querySelector('meta[property="og:image:alt"]')).toHaveAttribute('content', 'Project exterior');
    expect(document.head.querySelector('meta[property="og:title"]')).toHaveAttribute('content', 'Project | Kellum’s Second Chance Renovations');
    expect(document.head.querySelector('meta[property="og:image:width"]')).toBeNull();
  });

  it('preserves a Development host noindex through hydration and route navigation', async () => {
    document.head.insertAdjacentHTML('beforeend', '<meta name="robots" content="noindex, nofollow" data-runtime-indexing="disabled" />');
    expect(runtimeIndexingDisabled()).toBe(true);
    const view = render(<Seo title="Home" description="Home" path="/" />);
    await waitFor(() => expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow'));
    view.rerender(<Seo title="About" description="About" path="/about" />);
    await waitFor(() => expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow'));
    expect(document.head.querySelectorAll('meta[name="robots"]')).toHaveLength(1);
  });

  it('keeps a Production host indexable', async () => {
    document.head.insertAdjacentHTML('beforeend', '<meta name="robots" content="index, follow, max-image-preview:large" data-runtime-indexing="enabled" />');
    expect(runtimeIndexingDisabled()).toBe(false);
    render(<Seo title="Home" description="Home" path="/" />);
    await waitFor(() => expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'index, follow, max-image-preview:large'));
  });
});
