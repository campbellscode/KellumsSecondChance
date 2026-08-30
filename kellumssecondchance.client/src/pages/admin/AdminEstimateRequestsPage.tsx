import { Fragment, useCallback, useState } from 'react';
import { ChevronLeft, ChevronRight, Mail, Phone, Search } from 'lucide-react';
import styles from './AdminEstimateRequestsPage.module.css';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useAsync } from '@/lib/hooks/useAsync';
import {
  getAdminEstimateRequests,
  getAntiforgeryToken,
  updateAdminEstimateRequest,
} from '@/lib/api/endpoints';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { AdminEstimateRequest, EstimateRequestStatus } from '@/lib/api/types';

const STATUSES: readonly EstimateRequestStatus[] = [
  'New',
  'Contacted',
  'EstimateScheduled',
  'EstimateSent',
  'Won',
  'Lost',
  'Archived',
];

const STATUS_LABEL: Record<EstimateRequestStatus, string> = {
  New: 'New',
  Contacted: 'Contacted',
  EstimateScheduled: 'Estimate scheduled',
  EstimateSent: 'Estimate sent',
  Won: 'Won',
  Lost: 'Lost',
  Archived: 'Archived',
};

const STATUS_TONE: Record<EstimateRequestStatus, 'accent' | 'neutral' | 'success' | 'danger' | 'outline'> = {
  New: 'accent',
  Contacted: 'outline',
  EstimateScheduled: 'outline',
  EstimateSent: 'outline',
  Won: 'success',
  Lost: 'danger',
  Archived: 'neutral',
};

const PAGE_SIZE = 20;

export default function AdminEstimateRequestsPage() {
  const [status, setStatus] = useState<EstimateRequestStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loader = useCallback(
    (signal: AbortSignal) =>
      getAdminEstimateRequests({ status, page, pageSize: PAGE_SIZE, search: query }, signal),
    [status, page, query],
  );
  const requests = useAsync(loader);

  const changeStatus = async (request: AdminEstimateRequest, next: EstimateRequestStatus) => {
    setSaving(request.id);
    setSaveError(null);
    try {
      const { token } = await getAntiforgeryToken();
      await updateAdminEstimateRequest(request.id, { status: next }, token);
      requests.reload();
    } catch {
      setSaveError('That change did not save. Check your connection and try again.');
    } finally {
      setSaving(null);
    }
  };

  const items = requests.data?.items ?? [];
  const totalPages = requests.data?.totalPages ?? 1;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Estimate requests</h1>
          <p className={styles.subtitle}>
            {requests.data
              ? `${requests.data.totalCount} total${status !== 'all' ? ` · filtered by ${STATUS_LABEL[status]}` : ''}`
              : 'Loading…'}
          </p>
        </div>

        <form
          className={styles.searchForm}
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setQuery(search.trim());
          }}
        >
          <label className="u-visually-hidden" htmlFor="admin-search">
            Search estimate requests
          </label>
          <Search size={16} className={styles.searchIcon} aria-hidden="true" />
          <input
            id="admin-search"
            type="search"
            className={styles.search}
            placeholder="Name, email or reference"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button type="submit" size="sm" variant="secondary">
            Search
          </Button>
        </form>
      </header>

      <div className={styles.filters} role="group" aria-label="Filter by status">
        <button
          type="button"
          className={cn(styles.filter, status === 'all' && styles.filterActive)}
          aria-pressed={status === 'all'}
          onClick={() => {
            setStatus('all');
            setPage(1);
          }}
        >
          All
        </button>
        {STATUSES.map((value) => (
          <button
            type="button"
            key={value}
            className={cn(styles.filter, status === value && styles.filterActive)}
            aria-pressed={status === value}
            onClick={() => {
              setStatus(value);
              setPage(1);
            }}
          >
            {STATUS_LABEL[value]}
          </button>
        ))}
      </div>

      {saveError ? (
        <p className={styles.saveError} role="alert">
          {saveError}
        </p>
      ) : null}

      {requests.isLoading ? (
        <LoadingState label="Loading estimate requests" variant="list" count={6} />
      ) : requests.status === 'error' ? (
        <ErrorState
          title="Could not load estimate requests"
          description="The admin API did not respond. Check the server is running and try again."
          onRetry={requests.reload}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title={query || status !== 'all' ? 'Nothing matches those filters' : 'No estimate requests yet'}
          description={
            query || status !== 'all'
              ? 'Try clearing the search or choosing a different status.'
              : 'Requests submitted through the website will appear here as soon as they arrive.'
          }
          action={
            query || status !== 'all' ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setQuery('');
                  setStatus('all');
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption className="u-visually-hidden">
                Estimate requests, newest first. Expand a row to see the full enquiry.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Reference</th>
                  <th scope="col">Name</th>
                  <th scope="col">Project</th>
                  <th scope="col">Received</th>
                  <th scope="col">Status</th>
                  <th scope="col">
                    <span className="u-visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((request) => (
                  <Fragment key={request.id}>
                    <tr className={cn(expanded === request.id && styles.rowExpanded)}>
                      <td data-label="Reference">
                        <span className={styles.reference}>{request.reference}</span>
                      </td>
                      <td data-label="Name">
                        <span className={styles.name}>
                          {request.firstName} {request.lastName}
                        </span>
                        <span className={styles.contactRow}>
                          <a href={`mailto:${request.email}`} className={styles.contactLink}>
                            <Mail size={12} aria-hidden="true" />
                            {request.email}
                          </a>
                          {request.phone ? (
                            <a href={`tel:${request.phone}`} className={styles.contactLink}>
                              <Phone size={12} aria-hidden="true" />
                              {request.phone}
                            </a>
                          ) : null}
                        </span>
                      </td>
                      <td data-label="Project">
                        <span className={styles.projectTypes}>
                          {request.projectTypes.join(', ') || '—'}
                        </span>
                      </td>
                      <td data-label="Received">
                        <span className={styles.date}>{formatDateTime(request.createdAtUtc)}</span>
                      </td>
                      <td data-label="Status">
                        <Badge tone={STATUS_TONE[request.status]}>{STATUS_LABEL[request.status]}</Badge>
                      </td>
                      <td data-label="Actions">
                        <div className={styles.actions}>
                          <label className="u-visually-hidden" htmlFor={`status-${request.id}`}>
                            Change status for {request.reference}
                          </label>
                          <select
                            id={`status-${request.id}`}
                            className={styles.statusSelect}
                            value={request.status}
                            disabled={saving === request.id}
                            onChange={(event) =>
                              changeStatus(request, event.target.value as EstimateRequestStatus)
                            }
                          >
                            {STATUSES.map((value) => (
                              <option key={value} value={value}>
                                {STATUS_LABEL[value]}
                              </option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setExpanded(expanded === request.id ? null : request.id)}
                            aria-expanded={expanded === request.id}
                            aria-controls={`detail-${request.id}`}
                          >
                            {expanded === request.id ? 'Hide' : 'Details'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {expanded === request.id ? (
                      <tr className={styles.detailRow}>
                        <td colSpan={6} id={`detail-${request.id}`}>
                          <dl className={styles.detail}>
                            <div>
                              <dt>Description</dt>
                              <dd className={styles.description}>{request.description}</dd>
                            </div>
                            <div>
                              <dt>Property</dt>
                              <dd>{request.propertyType}</dd>
                            </div>
                            <div>
                              <dt>Location</dt>
                              <dd>
                                {[request.addressLine, request.city, request.postalCode]
                                  .filter(Boolean)
                                  .join(', ')}
                              </dd>
                            </div>
                            <div>
                              <dt>Timeline</dt>
                              <dd>{request.timeline}</dd>
                            </div>
                            <div>
                              <dt>Budget</dt>
                              <dd>{request.budgetRange}</dd>
                            </div>
                            <div>
                              <dt>Preferred contact</dt>
                              <dd>{request.preferredContactMethod}</dd>
                            </div>
                            <div>
                              <dt>Heard about us</dt>
                              <dd>{request.referralSource ?? '—'}</dd>
                            </div>
                          </dl>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <nav className={styles.pagination} aria-label="Pagination">
              <Button
                size="sm"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                iconLeft={<ChevronLeft size={15} />}
              >
                Previous
              </Button>
              <span className={styles.pageInfo} aria-live="polite">
                Page {page} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                iconRight={<ChevronRight size={15} />}
              >
                Next
              </Button>
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
