import { useEffect } from 'react';
import { business } from '@/content/business';
import { SCHEMA_CONTEXT } from './structuredData';

export interface SeoProps {
  /** Page title without the brand suffix — the suffix is added automatically. */
  title: string;
  description: string;
  /** Path only, e.g. "/projects/maple-street-kitchen". */
  path: string;
  /** Absolute or root-relative image path for social cards. */
  image?: string;
  imageAlt?: string;
  type?: 'website' | 'article';
  /** Keeps a page out of the index — used for admin and utility routes. */
  noIndex?: boolean;
  /** JSON-LD graph nodes for this page. */
  structuredData?: readonly object[];
}

const SEO_ATTR = 'data-seo';

function upsertMeta(selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(SEO_ATTR, '');
    document.head.appendChild(el);
  }
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    el.setAttribute(SEO_ATTR, '');
    document.head.appendChild(el);
  }
  el.href = href;
}

/**
 * Per-route document metadata.
 *
 * Tags are updated in place rather than appended, so the static defaults in
 * index.html are replaced instead of duplicated — no competing titles or
 * descriptions in the head.
 */
export function Seo({
  title,
  description,
  path,
  image,
  imageAlt,
  type = 'website',
  noIndex = false,
  structuredData,
}: SeoProps) {
  const fullTitle = title === business.legalName ? title : `${title} | ${business.legalName}`;
  const canonical = `${business.siteUrl}${path === '/' ? '/' : path.replace(/\/$/, '')}`;
  const imageUrl = `${business.siteUrl}${image ?? business.ogImagePath}`;
  const alt = imageAlt ?? `${business.legalName} — renovation work`;

  useEffect(() => {
    document.title = fullTitle;

    upsertMeta('meta[name="description"]', { name: 'description', content: description });
    upsertMeta('meta[name="robots"]', {
      name: 'robots',
      content: noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large',
    });
    upsertLink('canonical', canonical);

    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: fullTitle });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical });
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: business.legalName });
    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: imageUrl });
    upsertMeta('meta[property="og:image:alt"]', { property: 'og:image:alt', content: alt });
    upsertMeta('meta[property="og:locale"]', { property: 'og:locale', content: 'en_US' });

    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: fullTitle });
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: imageUrl });
    upsertMeta('meta[name="twitter:image:alt"]', { name: 'twitter:image:alt', content: alt });
  }, [fullTitle, description, canonical, imageUrl, alt, type, noIndex]);

  useEffect(() => {
    if (!structuredData || structuredData.length === 0) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute(SEO_ATTR, 'jsonld');
    /*
     * Always an @graph with one @context. A bare node without @context is not
     * valid JSON-LD and is silently ignored by search engines, so the shape must
     * not depend on how many nodes happened to survive the honesty guards.
     */
    script.textContent = JSON.stringify({
      '@context': SCHEMA_CONTEXT,
      '@graph': structuredData,
    });
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [structuredData]);

  return null;
}
