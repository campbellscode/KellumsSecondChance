import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getSiteContent } from '@/lib/api/endpoints';
import { sampleSiteContent } from '@/content/sampleContent/siteContent';
import { SiteContentContext, deriveSiteContent } from '@/lib/siteContentContext';
import type { SiteContent } from '@/lib/api/types';

/**
 * Supplies business contact details to the whole tree.
 *
 * Starts from the compile-time config so the first paint is never blank, then
 * upgrades to whatever the SiteSetting table holds. A failed fetch simply keeps
 * the compile-time values — contact details must never flicker or vanish.
 */
export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<SiteContent>(sampleSiteContent);

  useEffect(() => {
    const controller = new AbortController();
    getSiteContent(controller.signal)
      .then(setContent)
      .catch(() => {
        /* Keep the compile-time defaults; nothing user-facing changes. */
      });
    return () => controller.abort();
  }, []);

  const value = useMemo(() => deriveSiteContent(content), [content]);

  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}
