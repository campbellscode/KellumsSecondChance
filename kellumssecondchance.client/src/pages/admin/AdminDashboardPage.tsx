import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CircleAlert,
  Hammer,
  Inbox,
  Info,
  MessageSquareQuote,
  Settings,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import styles from './AdminDashboardPage.module.css';
import { PageHeader, Panel, Pill } from './components/AdminUi';
import adminUi from './components/AdminUi.module.css';
import { relativeAge } from './components/adminForm';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useAsync } from '@/lib/hooks/useAsync';
import { getDashboard } from '@/lib/api/admin';
import { cn } from '@/lib/cn';
import type { AttentionSeverity } from '@/lib/api/adminTypes';

const SEVERITY_ICON = {
  urgent: TriangleAlert,
  action: CircleAlert,
  info: Info,
} as const;

/**
 * The five things somebody opens the console to do.
 *
 * Deliberately five, and deliberately verbs. A row of shortcuts is only useful
 * if it is shorter than the navigation beside it — otherwise it is just the
 * menu again, in a box.
 */
const QUICK_ACTIONS = [
  { to: '/admin/projects/new', label: 'Add a project', icon: Hammer },
  { to: '/admin/estimate-requests?status=New', label: 'Review new leads', icon: Inbox },
  { to: '/admin/services', label: 'Add a service', icon: Sparkles },
  { to: '/admin/testimonials', label: 'Add a review', icon: MessageSquareQuote },
  { to: '/admin/site-settings', label: 'Business details', icon: Settings },
] as const;

const CONTACT_LABEL: Record<string, string> = {
  NoPreference: 'No preference',
  Phone: 'Prefers a call',
  Email: 'Prefers email',
  Text: 'Prefers a text',
};

const STATUS_LABEL: Record<string, string> = {
  New: 'New',
  Contacted: 'Contacted',
  EstimateScheduled: 'Visit booked',
  EstimateSent: 'Estimate sent',
  Won: 'Won',
  Lost: 'Lost',
  Archived: 'Archived',
};

/**
 * The operating picture.
 *
 * Every number on this screen is counted from real rows. There is deliberately
 * no revenue figure, no conversion rate and no trend arrow: this application
 * does not record what a job was worth, so any of those would be invented.
 *
 * The most useful part is not the counters — it is "Needs your attention",
 * which turns "why is my project not showing on the website?" into a list with
 * a link to the exact screen that fixes it.
 */
export default function AdminDashboardPage() {
  const loader = useCallback((signal: AbortSignal) => getDashboard(signal), []);
  const { data, status, error, reload } = useAsync(loader);

  if (status === 'loading') {
    return <LoadingState label="Loading your dashboard" variant="inline" />;
  }

  if (status === 'error' || !data) {
    return (
      <ErrorState
        title="We could not load the dashboard"
        description={error?.message ?? 'Your website did not answer. Check your connection and try again.'}
        onRetry={reload}
      />
    );
  }

  const { metrics, needsAttention, recentRequests } = data;

  const pipeline = [
    { label: 'New', value: metrics.newLeads, status: 'New', accent: true },
    { label: 'Contacted', value: metrics.awaitingFollowUp, status: 'Contacted' },
    { label: 'Visit booked', value: metrics.estimatesScheduled, status: 'EstimateScheduled' },
    { label: 'Estimate sent', value: metrics.estimatesSent, status: 'EstimateSent' },
    { label: 'Won', value: metrics.won, status: 'Won' },
    { label: 'Lost', value: metrics.lost, status: 'Lost' },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        lead="What has come in, and what is standing between your work and the website."
      />

      {/* ---- Quick actions --------------------------------------------- */}
      <nav className={styles.quickActions} aria-label="Common tasks">
        {QUICK_ACTIONS.map((action) => (
          <Link key={action.to} to={action.to} className={styles.quickAction}>
            <action.icon size={16} strokeWidth={1.8} aria-hidden="true" />
            <span>{action.label}</span>
          </Link>
        ))}
      </nav>

      {/* ---- Attention ------------------------------------------------- */}
      {needsAttention.length > 0 ? (
        <Panel
          title="Needs your attention"
          description="Each of these is something the public site is currently missing or withholding."
          className={styles.block}
        >
          <ul className={styles.attentionList}>
            {needsAttention.map((item, index) => {
              const Icon = SEVERITY_ICON[item.severity as AttentionSeverity] ?? Info;
              return (
                <li key={`${item.kind}-${index}`} className={cn(styles.attention, styles[item.severity])}>
                  <Icon size={17} strokeWidth={1.9} aria-hidden="true" className={styles.attentionIcon} />
                  <div className={styles.attentionText}>
                    <p className={styles.attentionTitle}>{item.title}</p>
                    <p className={styles.attentionDetail}>{item.detail}</p>
                  </div>
                  <Link to={item.actionPath} className={styles.attentionLink}>
                    <span>Fix this</span>
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
      ) : (
        <Panel className={styles.block}>
          <p className={styles.allClear}>
            Nothing needs your attention. Every published project has photographs, every question
            has an answer, and your business details are filled in.
          </p>
        </Panel>
      )}

      {/* ---- Pipeline --------------------------------------------------- */}
      <Panel
        title="Estimate requests"
        description={
          metrics.totalLeads === 0
            ? 'Nothing has come in through the website yet.'
            : `${metrics.totalLeads} in total · ${metrics.leadsLast30Days} in the last 30 days.`
        }
        className={styles.block}
      >
        <ul className={styles.pipeline}>
          {pipeline.map((stage) => (
            <li key={stage.status}>
              <Link
                to={`/admin/estimate-requests?status=${stage.status}`}
                className={cn(styles.stage, stage.accent && stage.value > 0 && styles.stageAccent)}
              >
                <span className={styles.stageValue}>{stage.value}</span>
                <span className={styles.stageLabel}>{stage.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>

      <div className={styles.split}>
        {/* ---- Recent leads --------------------------------------------- */}
        <Panel
          title="Latest requests"
          actions={
            <Link to="/admin/estimate-requests" className={adminUi.ghostButton}>
              See all
            </Link>
          }
        >
          {recentRequests.length === 0 ? (
            <p className={styles.quietBody}>
              When somebody fills in the estimate form, it will appear here straight away.
            </p>
          ) : (
            <ul className={styles.leadList}>
              {recentRequests.map((request) => (
                <li key={request.id}>
                  <Link to={`/admin/estimate-requests/${request.id}`} className={styles.lead}>
                    <span className={styles.leadTop}>
                      <span className={styles.leadName}>
                        {request.firstName} {request.lastName}
                      </span>
                      <Pill tone={request.status === 'New' ? 'warn' : 'info'}>
                        {STATUS_LABEL[request.status] ?? request.status}
                      </Pill>
                    </span>
                    <span className={styles.leadMeta}>
                      {request.projectTypes.length > 0
                        ? request.projectTypes.join(', ')
                        : 'No project type given'}
                      {' · '}
                      {relativeAge(request.createdAtUtc)}
                    </span>
                    {/*
                      How they asked to be reached. Shown here because it
                      changes what you do next — picking up the phone to
                      somebody who asked for email is a bad first impression.
                    */}
                    <span className={styles.leadContact}>
                      {CONTACT_LABEL[request.preferredContactMethod] ??
                        request.preferredContactMethod}
                      {request.phone ? ` · ${request.phone}` : ''}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* ---- Content counts ------------------------------------------- */}
        <Panel title="What is on the website">
          <dl className={styles.counts}>
            <CountRow
              label="Projects"
              live={metrics.publishedProjects}
              held={metrics.draftProjects}
              heldLabel="draft"
              to="/admin/projects"
            />
            <CountRow
              label="Services"
              live={metrics.publishedServices}
              held={metrics.inactiveServices}
              heldLabel="switched off"
              to="/admin/services"
            />
            <CountRow
              label="Reviews"
              live={metrics.publishedTestimonials}
              held={metrics.unpublishedTestimonials}
              heldLabel="unpublished"
              to="/admin/testimonials"
            />
            <CountRow
              label="Questions"
              live={metrics.publishedFaqs}
              held={metrics.faqsAwaitingReview}
              heldLabel="awaiting your answer"
              to="/admin/faqs"
            />
            <CountRow label="Service areas" live={metrics.activeServiceAreas} to="/admin/service-areas" />
          </dl>
        </Panel>
      </div>
    </>
  );
}

interface CountRowProps {
  label: string;
  live: number;
  held?: number;
  heldLabel?: string;
  to: string;
}

function CountRow({ label, live, held, heldLabel, to }: CountRowProps) {
  return (
    <div className={styles.countRow}>
      <dt className={styles.countLabel}>
        <Link to={to}>{label}</Link>
      </dt>
      <dd className={styles.countValue}>
        <span className={styles.countLive}>{live} live</span>
        {held !== undefined && held > 0 ? (
          <span className={styles.countHeld}>
            {held} {heldLabel}
          </span>
        ) : null}
      </dd>
    </div>
  );
}
