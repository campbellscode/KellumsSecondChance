import { useCallback } from 'react';
import { ExternalLink } from 'lucide-react';
import styles from './AdminContentPage.module.css';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useAsync } from '@/lib/hooks/useAsync';
import { getFaqs, getProjects, getServiceAreas, getServices, getTestimonials } from '@/lib/api/endpoints';

export type ContentKind =
  | 'projects'
  | 'services'
  | 'testimonials'
  | 'faqs'
  | 'service-areas'
  | 'site-settings';

interface Row {
  readonly id: string | number;
  readonly primary: string;
  readonly secondary: string;
  readonly badges: readonly { readonly label: string; readonly tone: 'accent' | 'neutral' | 'outline' }[];
  readonly href?: string;
}

const META: Record<ContentKind, { title: string; lead: string; publicPath?: string }> = {
  projects: {
    title: 'Projects',
    lead: 'Case studies shown in the gallery. Order, featured status and before/after pairing are all data.',
    publicPath: '/projects',
  },
  services: {
    title: 'Services',
    lead: 'The service catalogue. Reorder, feature or deactivate any entry without a code change.',
    publicPath: '/services',
  },
  testimonials: {
    title: 'Testimonials',
    lead: 'Customer reviews. Anything marked as sample content is labelled on the public site.',
    publicPath: '/reviews',
  },
  faqs: {
    title: 'FAQs',
    lead: 'Questions and answers, grouped by category and used for the FAQ structured data.',
    publicPath: '/faq',
  },
  'service-areas': {
    title: 'Service areas',
    lead: 'Cities, counties, regions and postal codes. Placeholder entries are labelled publicly.',
    publicPath: '/service-area',
  },
  'site-settings': {
    title: 'Site settings',
    lead: 'Business name, phone, email, address, hours and social links.',
  },
};

/**
 * Read-only content console.
 *
 * The data model, DTOs and read APIs behind every content type are complete, so
 * this page shows the live records exactly as the public site sees them. Write
 * operations for these types are the next phase — deliberately not stubbed out
 * with buttons that do nothing.
 */
export default function AdminContentPage({ kind }: { kind: ContentKind }) {
  const meta = META[kind];

  const loader = useCallback(
    async (signal: AbortSignal): Promise<Row[]> => {
      switch (kind) {
        case 'projects': {
          const items = await getProjects({}, signal);
          return items.map((p) => ({
            id: p.id,
            primary: p.title,
            secondary: `${p.category}${p.location ? ` · ${p.location}` : ''} · /projects/${p.slug}`,
            badges: [
              ...(p.isFeatured ? ([{ label: 'Featured', tone: 'accent' } as const]) : []),
              ...(p.hasBeforeAfter ? ([{ label: 'Before/After', tone: 'outline' } as const]) : []),
              { label: `Order ${p.displayOrder}`, tone: 'neutral' } as const,
            ],
            href: `/projects/${p.slug}`,
          }));
        }
        case 'services': {
          const items = await getServices(signal);
          return items.map((s) => ({
            id: s.id,
            primary: s.name,
            secondary: `${s.tagline} · /services/${s.slug}`,
            badges: [
              ...(s.isFeatured ? ([{ label: 'Featured', tone: 'accent' } as const]) : []),
              { label: `Order ${s.displayOrder}`, tone: 'neutral' } as const,
            ],
            href: `/services/${s.slug}`,
          }));
        }
        case 'testimonials': {
          const items = await getTestimonials({}, signal);
          return items.map((t) => ({
            id: t.id,
            primary: `${t.firstName}${t.lastInitial ? ` ${t.lastInitial}.` : ''} — ${t.rating}/5`,
            secondary: t.quote,
            badges: [
              ...(t.isSampleContent ? ([{ label: 'Sample content', tone: 'outline' } as const]) : []),
              ...(t.isFeatured ? ([{ label: 'Featured', tone: 'accent' } as const]) : []),
              { label: t.source, tone: 'neutral' } as const,
            ],
          }));
        }
        case 'faqs': {
          const items = await getFaqs(signal);
          return items.map((f) => ({
            id: f.id,
            primary: f.question,
            secondary: f.answer,
            badges: [{ label: f.category, tone: 'neutral' } as const],
          }));
        }
        case 'service-areas': {
          const items = await getServiceAreas(signal);
          return items.map((a) => ({
            id: a.id,
            primary: a.name,
            secondary: a.note ?? a.postalCodes.join(' · ') ?? '',
            badges: [
              { label: a.kind, tone: 'neutral' } as const,
              ...(a.isPrimary ? ([{ label: 'Primary', tone: 'accent' } as const]) : []),
              ...(a.isSampleContent ? ([{ label: 'Placeholder', tone: 'outline' } as const]) : []),
            ],
          }));
        }
        case 'site-settings':
        default:
          return [];
      }
    },
    [kind],
  );

  const rows = useAsync(loader);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{meta.title}</h1>
          <p className={styles.lead}>{meta.lead}</p>
        </div>
        {meta.publicPath ? (
          <Button as="a" href={meta.publicPath} size="sm" variant="secondary" iconRight={<ExternalLink size={14} />}>
            View live
          </Button>
        ) : null}
      </header>

      <div className={styles.notice}>
        <p className={styles.noticeTitle}>Read-only for now</p>
        <p className={styles.noticeBody}>
          The data model, DTOs and read endpoints for {meta.title.toLowerCase()} are complete, so what
          you see here is exactly what the public site is serving. In-browser editing is the next
          development phase — until then, edit the seed data in{' '}
          <code>Data/Seed/SampleContent.cs</code> and reseed, or update records directly in the
          database.
        </p>
      </div>

      {kind === 'site-settings' ? (
        <div className={styles.settings}>
          <p className={styles.settingsBody}>
            Site settings live in the <code>SiteSettings</code> table and are served by{' '}
            <code>GET /api/site-content</code>. Compile-time defaults — used before the database is
            populated, and as the offline fallback — are in{' '}
            <code>src/content/business.ts</code>. Any value left null there is deliberately hidden on
            the public site rather than replaced with a placeholder.
          </p>
        </div>
      ) : rows.isLoading ? (
        <LoadingState label={`Loading ${meta.title.toLowerCase()}`} variant="list" count={6} />
      ) : rows.status === 'error' ? (
        <ErrorState
          title={`Could not load ${meta.title.toLowerCase()}`}
          description="The API did not respond."
          onRetry={rows.reload}
        />
      ) : (
        <ul className={styles.list}>
          {(rows.data ?? []).map((row) => (
            <li key={row.id} className={styles.row}>
              <div className={styles.rowBody}>
                <p className={styles.rowPrimary}>{row.primary}</p>
                <p className={styles.rowSecondary}>{row.secondary}</p>
              </div>
              <div className={styles.rowBadges}>
                {row.badges.map((badge) => (
                  <Badge key={badge.label} tone={badge.tone}>
                    {badge.label}
                  </Badge>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
