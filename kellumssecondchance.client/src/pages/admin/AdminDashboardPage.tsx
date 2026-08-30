import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Inbox } from 'lucide-react';
import styles from './AdminDashboardPage.module.css';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useAsync } from '@/lib/hooks/useAsync';
import { getAdminEstimateRequests } from '@/lib/api/endpoints';
import { formatDateTime } from '@/lib/format';

const NEEDS_INPUT = [
  { label: 'Phone number', where: 'src/content/business.ts → business.phone' },
  { label: 'Email address', where: 'src/content/business.ts → business.email' },
  { label: 'Business address', where: 'src/content/business.ts → business.address' },
  { label: 'Service area', where: '/admin/service-areas (currently placeholder data)' },
  { label: 'Real reviews', where: '/admin/testimonials (currently sample content)' },
  { label: 'Project photography', where: 'public/media (currently generated placeholders)' },
  { label: 'Owner and team details', where: 'AboutPage.tsx → team section' },
  { label: 'Licensing and insurance', where: 'src/content/business.ts' },
];

export default function AdminDashboardPage() {
  const loader = useCallback(
    (signal: AbortSignal) => getAdminEstimateRequests({ page: 1, pageSize: 5 }, signal),
    [],
  );
  const recent = useAsync(loader);

  const newCount = (recent.data?.items ?? []).filter((r) => r.status === 'New').length;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>Everything that needs your attention, in one place.</p>
      </header>

      <section className={styles.section} aria-labelledby="recent-heading">
        <div className={styles.sectionHead}>
          <h2 id="recent-heading" className={styles.sectionTitle}>
            Latest estimate requests
          </h2>
          <Button as="link" to="/admin/estimate-requests" size="sm" variant="secondary" iconRight={<ArrowUpRight size={15} />}>
            View all
          </Button>
        </div>

        {recent.isLoading ? (
          <LoadingState label="Loading recent requests" variant="list" count={4} />
        ) : recent.status === 'error' ? (
          <ErrorState
            title="Could not load recent requests"
            description="The admin API did not respond."
            onRetry={recent.reload}
          />
        ) : (recent.data?.items ?? []).length === 0 ? (
          <div className={styles.empty}>
            <Inbox size={22} strokeWidth={1.6} aria-hidden="true" />
            <div>
              <p className={styles.emptyTitle}>Nothing has come in yet.</p>
              <p className={styles.emptyBody}>
                Requests submitted through the website land here immediately.
              </p>
            </div>
          </div>
        ) : (
          <>
            {newCount > 0 ? (
              <p className={styles.alert}>
                <Badge tone="accent">{newCount} new</Badge>
                <span>
                  {newCount === 1 ? 'One request has' : `${newCount} requests have`} not been
                  contacted yet.
                </span>
              </p>
            ) : null}

            <ul className={styles.list}>
              {(recent.data?.items ?? []).map((request) => (
                <li key={request.id}>
                  <Link to="/admin/estimate-requests" className={styles.item}>
                    <span className={styles.itemRef}>{request.reference}</span>
                    <span className={styles.itemName}>
                      {request.firstName} {request.lastName}
                    </span>
                    <span className={styles.itemProject}>
                      {request.projectTypes.join(', ') || 'No project type given'}
                    </span>
                    <span className={styles.itemDate}>{formatDateTime(request.createdAtUtc)}</span>
                    <Badge tone={request.status === 'New' ? 'accent' : 'neutral'}>{request.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className={styles.section} aria-labelledby="setup-heading">
        <h2 id="setup-heading" className={styles.sectionTitle}>
          Still needed before launch
        </h2>
        <p className={styles.sectionLead}>
          These are deliberately left blank or filled with clearly-labelled sample content rather
          than invented. The public site hides anything that has not been supplied.
        </p>
        <ul className={styles.checklist}>
          {NEEDS_INPUT.map((item) => (
            <li key={item.label}>
              <span className={styles.checkLabel}>{item.label}</span>
              <span className={styles.checkWhere}>{item.where}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
