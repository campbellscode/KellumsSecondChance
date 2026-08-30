import { createContext, useContext } from 'react';
import { sampleSiteContent } from '@/content/sampleContent/siteContent';
import type { SiteContent } from '@/lib/api/types';

export interface SiteContentValue {
  readonly content: SiteContent;
  /** null unless the business has supplied a real phone number. */
  readonly phone: { readonly display: string; readonly href: string } | null;
  readonly email: string | null;
}

export function deriveSiteContent(content: SiteContent): SiteContentValue {
  const phone =
    content.phoneDisplay && content.phoneE164
      ? { display: content.phoneDisplay, href: `tel:${content.phoneE164}` }
      : null;
  return { content, phone, email: content.email };
}

export const SiteContentContext = createContext<SiteContentValue | null>(null);

/**
 * Business contact details. Falls back to the compile-time defaults outside a
 * provider so a component is never left without a value.
 */
export function useSiteContent(): SiteContentValue {
  return useContext(SiteContentContext) ?? deriveSiteContent(sampleSiteContent);
}
