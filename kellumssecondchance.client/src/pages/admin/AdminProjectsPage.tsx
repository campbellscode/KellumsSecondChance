import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, ExternalLink, ImageOff, Plus, SlidersHorizontal } from 'lucide-react';
import styles from './AdminListPages.module.css';
import {
  DataTable,
  GhostButton,
  Notice,
  PageHeader,
  Panel,
  Pill,
  PublishPill,
  Toolbar,
} from './components/AdminUi';
import adminUi from './components/AdminUi.module.css';
import { formatDate } from './components/adminForm';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useAsync } from '@/lib/hooks/useAsync';
import { listAdminProjects, reorderProjects } from '@/lib/api/admin';
import { useToast } from './components/adminFeedback';
import type { Column } from './components/AdminUi';
import type { AdminProjectListItem } from '@/lib/api/adminTypes';

type Filter = 'all' | 'live' | 'draft' | 'needsWork';

const FILTERS: readonly { value: Filter; label: string }[] = [
  { value: 'all', label: 'Everything' },
  { value: 'live', label: 'On the site' },
  { value: 'draft', label: 'Drafts' },
  { value: 'needsWork', label: 'Missing photographs' },
];

/**
 * The project gallery, from the inside.
 *
 * The columns are chosen around the two questions an owner actually asks:
 * "is this on the website?" and "why isn't it?". A published project with no
 * cover photograph is flagged here rather than being discovered by a visitor.
 */
export default function AdminProjectsPage() {
  const navigate = useNavigate();
  const loader = useCallback((signal: AbortSignal) => listAdminProjects(signal), []);
  const { data, status, error, reload } = useAsync(loader);
  const [filter, setFilter] = useState<Filter>('all');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  /*
   * Reordering acts on the WHOLE list, not the filtered view.
   *
   * Moving a project up while a filter hides its neighbours would otherwise
   * jump it past records the person cannot see, so the controls only appear
   * when everything is showing.
   */
  const move = useCallback(
    async (id: number, direction: -1 | 1) => {
      const all = [...(data ?? [])];
      const index = all.findIndex((project) => project.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= all.length) return;

      const [moved] = all.splice(index, 1);
      all.splice(target, 0, moved!);

      setBusy(true);
      try {
        await reorderProjects(all.map((project) => project.id));
        reload();
      } catch (caught) {
        toast.error(caught instanceof Error ? caught.message : 'The new order was not saved.');
        reload();
      } finally {
        setBusy(false);
      }
    },
    [data, reload, toast],
  );

  const rows = useMemo(() => {
    const all = data ?? [];
    switch (filter) {
      case 'live':
        return all.filter((p) => p.isActive);
      case 'draft':
        return all.filter((p) => !p.isActive);
      case 'needsWork':
        return all.filter((p) => !p.hasCoverImage || !p.hasBeforeAfter);
      default:
        return all;
    }
  }, [data, filter]);

  const columns = useMemo<readonly Column<AdminProjectListItem>[]>(
    () => [
      {
        key: 'title',
        header: 'Project',
        render: (row) => (
          <Link to={`/admin/projects/${row.id}`} className={styles.primaryCell}>
            <span className={styles.primaryText}>{row.title}</span>
            <span className={styles.secondaryText}>
              {row.categoryName}
              {row.location ? ` · ${row.location}` : ''}
            </span>
          </Link>
        ),
      },
      {
        key: 'photos',
        header: 'Photographs',
        hideBelow: 'sm',
        render: (row) => (
          <span className={styles.badgeRow}>
            <span className={styles.count}>{row.imageCount}</span>
            {!row.hasCoverImage ? <Pill tone="warn">No cover</Pill> : null}
            {!row.hasBeforeAfter ? <Pill tone="info">No before/after</Pill> : null}
          </span>
        ),
      },
      {
        key: 'completed',
        header: 'Completed',
        hideBelow: 'lg',
        render: (row) => <span className={styles.muted}>{formatDate(row.completedOn)}</span>,
      },
      {
        key: 'state',
        header: 'Status',
        align: 'end',
        render: (row) => (
          <span className={styles.badgeRow}>
            {row.isSampleContent ? <Pill tone="sample">Example</Pill> : null}
            {row.isFeatured ? <Pill tone="info">Featured</Pill> : null}
            <PublishPill isActive={row.isActive} />
          </span>
        ),
      },
      {
        key: 'order',
        header: 'Order',
        headerHidden: true,
        render: (row) => {
          const all = data ?? [];
          const index = all.findIndex((p) => p.id === row.id);
          // Only offered on the unfiltered list, where the neighbours are visible.
          if (filter !== 'all' || index < 0) return null;

          return (
            <span className={styles.rowActions}>
              <GhostButton
                onClick={() => void move(row.id, -1)}
                disabled={busy || index === 0}
                title="Show this project earlier in the gallery"
              >
                <ArrowUp size={14} aria-hidden="true" />
                <span className="u-visually-hidden">Move {row.title} earlier</span>
              </GhostButton>
              <GhostButton
                onClick={() => void move(row.id, 1)}
                disabled={busy || index === all.length - 1}
                title="Show this project later in the gallery"
              >
                <ArrowDown size={14} aria-hidden="true" />
                <span className="u-visually-hidden">Move {row.title} later</span>
              </GhostButton>
            </span>
          );
        },
      },
      {
        key: 'actions',
        header: 'Actions',
        headerHidden: true,
        align: 'end',
        render: (row) => (
          <span className={styles.rowActions}>
            {row.isActive ? (
              <a
                className={adminUi.ghostButton}
                href={`/projects/${row.slug}`}
                target="_blank"
                rel="noreferrer"
                title="Open on the public site"
              >
                <ExternalLink size={14} aria-hidden="true" />
                <span className="u-visually-hidden">View {row.title} on the website</span>
              </a>
            ) : null}
            <Link to={`/admin/projects/${row.id}`} className={adminUi.secondaryButton}>
              Edit
            </Link>
          </span>
        ),
      },
    ],
    [data, filter, busy, move],
  );

  const counts = data
    ? {
        live: data.filter((p) => p.isActive).length,
        draft: data.filter((p) => !p.isActive).length,
        needsWork: data.filter((p) => !p.hasCoverImage || !p.hasBeforeAfter).length,
      }
    : null;

  return (
    <>
      <PageHeader
        title="Projects"
        lead="Your case studies. Each one is a page on the website with its own photographs and before/after comparison."
        eyebrow={counts ? `${counts.live} on the site · ${counts.draft} drafts` : undefined}
        actions={
          <button
            type="button"
            className={adminUi.primaryButton}
            onClick={() => navigate('/admin/projects/new')}
          >
            <Plus size={15} aria-hidden="true" />
            New project
          </button>
        }
      />

      {counts && counts.needsWork > 0 ? (
        <div className={styles.noticeBlock}>
          <Notice tone="warn" title="Some projects are missing photographs">
            <ImageOff size={14} aria-hidden="true" className={styles.inlineIcon} /> A project with no
            cover photograph shows a blank card in the gallery, and one without a matched
            before/after pair has no transformation slider.{' '}
            <button type="button" className={styles.linkButton} onClick={() => setFilter('needsWork')}>
              Show the {counts.needsWork} affected
            </button>
            .
          </Notice>
        </div>
      ) : null}

      <Toolbar>
        <div className={styles.segmented} role="group" aria-label="Filter projects">
          <SlidersHorizontal size={14} aria-hidden="true" className={styles.segmentedIcon} />
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={filter === option.value ? styles.segmentActive : styles.segment}
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </Toolbar>

      {status === 'loading' ? (
        <LoadingState label="Loading projects" variant="inline" />
      ) : status === 'error' ? (
        <ErrorState
          title="We could not load your projects"
          description={error?.message ?? 'Your website did not answer. Check your connection and try again.'}
          onRetry={reload}
        />
      ) : (
        <Panel flush>
          <DataTable
            caption="Projects"
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            flagRow={(row) => row.isActive && !row.hasCoverImage}
            empty={
              <div className={styles.emptyInner}>
                <p className={styles.emptyTitle}>
                  {filter === 'all' ? 'No projects yet' : 'Nothing matches that filter'}
                </p>
                <p className={styles.emptyBody}>
                  {filter === 'all'
                    ? 'A project is a finished job written up as a story — what the space was like, what you did, and what it became. Add photographs and it appears in the gallery.'
                    : 'Try a different filter.'}
                </p>
                {filter === 'all' ? (
                  <p className={styles.emptyAction}>
                    <Link to="/admin/projects/new" className={adminUi.primaryButton}>
                      <Plus size={15} aria-hidden="true" />
                      New project
                    </Link>
                  </p>
                ) : null}
              </div>
            }
          />
        </Panel>
      )}
    </>
  );
}
