import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import styles from './AdminEstimateRequestsPage.module.css';
import { DataTable, PageHeader, Panel, Pill, Toolbar } from './components/AdminUi';
import adminUi from './components/AdminUi.module.css';
import { formatDate, relativeAge } from './components/adminForm';
import { STATUS_META, STATUS_ORDER } from './estimateStatus';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useAsync } from '@/lib/hooks/useAsync';
import { getEstimateRequestProjectTypes, searchEstimateRequests } from '@/lib/api/admin';
import type { Column } from './components/AdminUi';
import type { AdminEstimateRequest, EstimateRequestStatus } from '@/lib/api/types';
import type { EstimateRequestSort } from '@/lib/api/adminTypes';

const PAGE_SIZE = 25;

const SORTS: readonly { value: EstimateRequestSort; label: string }[] = [
  { value: 'NewestFirst', label: 'Newest first' },
  { value: 'OldestFirst', label: 'Oldest first' },
  { value: 'Status', label: 'By stage' },
  { value: 'Customer', label: 'By customer name' },
];

/**
 * The lead list.
 *
 * Filters live in the URL, so a filtered view can be bookmarked, shared with a
 * colleague, and — importantly — linked to from the dashboard ("3 new leads
 * have not been contacted" goes straight to the filtered list).
 */
export default function AdminEstimateRequestsPage() {
  const [params, setParams] = useSearchParams();

  const status = params.get('status') ?? 'all';
  const projectType = params.get('projectType') ?? '';
  const search = params.get('search') ?? '';
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const sort = (params.get('sort') as EstimateRequestSort | null) ?? 'NewestFirst';
  const page = Number(params.get('page') ?? '1') || 1;

  const loader = useCallback(
    (signal: AbortSignal) =>
      searchEstimateRequests(
        {
          status: status as EstimateRequestStatus | 'all',
          projectType: projectType || undefined,
          search: search || undefined,
          from: from || undefined,
          to: to || undefined,
          sort,
          page,
          pageSize: PAGE_SIZE,
        },
        signal,
      ),
    [status, projectType, search, from, to, sort, page],
  );

  const { data, status: loadStatus, error, reload } = useAsync(loader);

  const facetLoader = useCallback(
    (signal: AbortSignal) => getEstimateRequestProjectTypes(signal),
    [],
  );
  const facets = useAsync(facetLoader);

  /** Any filter change resets to page 1 — page 4 of a new filter is nonsense. */
  const setFilter = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== 'page') next.delete('page');
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  /*
   * The search box is typed into locally and only reaches the URL — and
   * therefore the server — once typing pauses. Without this, "kitchen" fires
   * seven searches and rewrites the history entry seven times.
   */
  const [searchDraft, setSearchDraft] = useState(search);

  useEffect(() => {
    if (searchDraft === search) return;
    const timer = window.setTimeout(() => setFilter('search', searchDraft), 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft, search, setFilter]);

  const clearFilters = () => {
    setSearchDraft('');
    setParams(new URLSearchParams(), { replace: true });
  };

  const hasFilters = Boolean(
    (status && status !== 'all') || projectType || search || from || to || sort !== 'NewestFirst',
  );

  const columns = useMemo<readonly Column<AdminEstimateRequest>[]>(
    () => [
      {
        key: 'customer',
        header: 'Customer',
        render: (row) => (
          <Link to={`/admin/estimate-requests/${row.id}`} className={styles.customerCell}>
            <span className={styles.customerName}>
              {row.firstName} {row.lastName}
            </span>
            <span className={styles.customerRef}>{row.reference}</span>
          </Link>
        ),
      },
      {
        key: 'project',
        header: 'Project',
        hideBelow: 'md',
        render: (row) =>
          row.projectTypes.length > 0 ? (
            <span className={styles.wrapCell}>{row.projectTypes.join(', ')}</span>
          ) : (
            <span className={styles.none}>Not specified</span>
          ),
      },
      {
        key: 'where',
        header: 'Where',
        hideBelow: 'lg',
        render: (row) => (
          <span className={styles.wrapCell}>
            {[row.city, row.postalCode].filter(Boolean).join(' ') || '—'}
          </span>
        ),
      },
      {
        key: 'received',
        header: 'Received',
        hideBelow: 'sm',
        render: (row) => (
          <span className={styles.received}>
            <span>{formatDate(row.createdAtUtc)}</span>
            <span className={styles.age}>{relativeAge(row.createdAtUtc)}</span>
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Stage',
        align: 'end',
        render: (row) => (
          <Pill tone={STATUS_META[row.status].tone}>{STATUS_META[row.status].label}</Pill>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Estimate requests"
        lead="Everybody who has asked for an estimate through the website. Open one to call them, record what was said and move it along."
        eyebrow={data ? `${data.totalCount} matching` : undefined}
      />

      <Toolbar>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Search</span>
          <span className={styles.searchWrap}>
            <Search size={15} aria-hidden="true" className={styles.searchIcon} />
            <input
              type="search"
              className={styles.input}
              value={searchDraft}
              placeholder="Name, email, reference, ZIP code…"
              onChange={(event) => setSearchDraft(event.target.value)}
            />
          </span>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Stage</span>
          <select
            className={styles.input}
            value={status}
            onChange={(event) => setFilter('status', event.target.value)}
          >
            <option value="all">Every stage</option>
            {STATUS_ORDER.map((value) => (
              <option key={value} value={value}>
                {STATUS_META[value].label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Project type</span>
          <select
            className={styles.input}
            value={projectType}
            onChange={(event) => setFilter('projectType', event.target.value)}
          >
            <option value="">Any type</option>
            {(facets.data ?? []).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>From</span>
          <input
            type="date"
            className={styles.input}
            value={from}
            max={to || undefined}
            onChange={(event) => setFilter('from', event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>To</span>
          <input
            type="date"
            className={styles.input}
            value={to}
            min={from || undefined}
            onChange={(event) => setFilter('to', event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Order</span>
          <select
            className={styles.input}
            value={sort}
            onChange={(event) => setFilter('sort', event.target.value)}
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {hasFilters ? (
          <button type="button" className={adminUi.ghostButton} onClick={clearFilters}>
            <X size={14} aria-hidden="true" />
            Clear filters
          </button>
        ) : null}
      </Toolbar>

      {loadStatus === 'loading' ? (
        <LoadingState label="Loading requests" variant="inline" />
      ) : loadStatus === 'error' || !data ? (
        <ErrorState
          title="We could not load your requests"
          description={error?.message ?? 'Your website did not answer. Check your connection and try again.'}
          onRetry={reload}
        />
      ) : (
        <Panel flush>
          <DataTable
            caption="Estimate requests"
            columns={columns}
            rows={data.items}
            rowKey={(row) => row.id}
            flagRow={(row) => row.status === 'New'}
            empty={
              hasFilters ? (
                <div className={styles.emptyInner}>
                  <p className={styles.emptyTitle}>Nothing matches those filters</p>
                  <p className={styles.emptyBody}>
                    Try widening the date range, or{' '}
                    <button type="button" className={styles.linkButton} onClick={clearFilters}>
                      clear the filters
                    </button>
                    .
                  </p>
                </div>
              ) : (
                <div className={styles.emptyInner}>
                  <p className={styles.emptyTitle}>No requests yet</p>
                  <p className={styles.emptyBody}>
                    When somebody completes the estimate form on the website, it lands here
                    immediately — there is nothing to set up.
                  </p>
                </div>
              )
            }
          />

          {data.totalPages > 1 ? (
            <nav className={styles.pager} aria-label="Pages">
              <button
                type="button"
                className={adminUi.secondaryButton}
                disabled={page <= 1}
                onClick={() => setFilter('page', String(page - 1))}
              >
                Previous
              </button>
              <p className={styles.pagerStatus} aria-live="polite">
                Page {data.page} of {data.totalPages}
              </p>
              <button
                type="button"
                className={adminUi.secondaryButton}
                disabled={page >= data.totalPages}
                onClick={() => setFilter('page', String(page + 1))}
              >
                Next
              </button>
            </nav>
          ) : null}
        </Panel>
      )}
    </>
  );
}
