import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Archive, ArrowLeft, Mail, MessageSquare, Phone, RotateCcw, Trash2 } from 'lucide-react';
import styles from './AdminEstimateRequestDetailPage.module.css';
import {
  GhostButton,
  Notice,
  PageHeader,
  Panel,
  Pill,
  PrimaryButton,
  SecondaryButton,
} from './components/AdminUi';
import { ConfirmDialog } from './components/Dialog';
import { useDirtyGuard, useToast } from './components/adminFeedback';
import { formatDateTime, relativeAge } from './components/adminForm';
import {
  BUDGET_LABEL,
  CONTACT_LABEL,
  PROPERTY_LABEL,
  STATUS_META,
  STATUS_ORDER,
  TIMELINE_LABEL,
} from './estimateStatus';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useAsync } from '@/lib/hooks/useAsync';
import {
  addEstimateRequestNote,
  changeEstimateRequestStatus,
  deleteEstimateRequestNote,
  getEstimateRequest,
  retryEstimateRequestNotification,
} from '@/lib/api/admin';
import { ApiError } from '@/lib/api/client';
import type { EstimateRequestStatus } from '@/lib/api/types';
import type { AdminEstimateRequestDetail } from '@/lib/api/adminTypes';

/**
 * One lead, in full.
 *
 * The design goal is that a person can act on it without leaving the page:
 * call, email, record what happened, move the stage. The customer's own words
 * are given the most room, because that is what the estimate depends on.
 *
 * Notes and stage history are INTERNAL. No public endpoint returns either, and
 * nothing typed here reaches the customer.
 */
export default function AdminEstimateRequestDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const guard = useDirtyGuard();

  const numericId = Number(id);
  const loader = useCallback(
    (signal: AbortSignal) => getEstimateRequest(numericId, signal),
    [numericId],
  );
  const { data, status, error, reload } = useAsync(loader);

  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<number | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const retryNotification = async () => {
    setBusy(true);
    try {
      await retryEstimateRequestNotification(request.id);
      toast.success('Notification retry finished.');
      reload();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'The notification could not be retried.');
    } finally {
      setBusy(false);
    }
  };

  /*
   * A half-typed note counts as unsaved work. Somebody records "called, wants
   * the kitchen before the holidays", clicks Projects, and it is gone — so the
   * shell asks first, exactly as it does for a form.
   */
  const { setDirty } = guard;
  useEffect(() => {
    setDirty(note.trim().length > 0);
    return () => setDirty(false);
  }, [note, setDirty]);

  if (Number.isNaN(numericId)) {
    return <ErrorState title="That is not a valid request" description="Check the link and try again." />;
  }

  if (status === 'loading') return <LoadingState label="Loading this request" variant="inline" />;

  if (status === 'error' || !data) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <ErrorState
        title={notFound ? 'That request no longer exists' : 'We could not load this request'}
        description={
          notFound
            ? 'It may have been removed. Go back to the list to see what is there now.'
            : (error?.message ?? 'Your website did not answer. Check your connection and try again.')
        }
        onRetry={notFound ? undefined : reload}
      />
    );
  }

  const request = data.request;
  const meta = STATUS_META[request.status];
  const isArchived = request.status === 'Archived';

  const changeStatus = async (next: EstimateRequestStatus) => {
    setBusy(true);
    setStatusError(null);
    try {
      await changeEstimateRequestStatus(request.id, next, data.rowVersion);
      toast.success(`Moved to ${STATUS_META[next].label.toLowerCase()}.`);
      reload();
    } catch (caught) {
      const message =
        caught instanceof ApiError && caught.status === 409
          ? 'Somebody else changed this request while you had it open. Reload to see where it is now.'
          : caught instanceof Error
            ? caught.message
            : 'The stage was not changed.';
      setStatusError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const submitNote = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = note.trim();
    if (!text) return;

    setBusy(true);
    try {
      await addEstimateRequestNote(request.id, text);
      setNote('');
      toast.success('Note added.');
      reload();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'The note was not saved.');
    } finally {
      setBusy(false);
    }
  };

  const removeNote = async (noteId: number) => {
    setBusy(true);
    try {
      await deleteEstimateRequestNote(request.id, noteId);
      toast.success('Note removed.');
      reload();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'The note was not removed.');
    } finally {
      setBusy(false);
      setNoteToDelete(null);
    }
  };

  return (
    <>
      <button
        type="button"
        className={styles.back}
        onClick={() => guard.confirmDiscard(() => navigate('/admin/estimate-requests'))}
      >
        <ArrowLeft size={15} aria-hidden="true" />
        <span>All estimate requests</span>
      </button>

      <PageHeader
        eyebrow={`${request.reference} · received ${relativeAge(request.createdAtUtc)}`}
        title={`${request.firstName} ${request.lastName}`}
        lead={
          <>
            {formatDateTime(request.createdAtUtc)}
            {request.referralSource ? ` · found us through ${request.referralSource}` : ''}
          </>
        }
        actions={
          <>
            {request.phone ? (
              <a className={styles.callButton} href={`tel:${request.phone.replace(/[^\d+]/g, '')}`}>
                <Phone size={15} aria-hidden="true" />
                <span>Call {request.phone}</span>
              </a>
            ) : null}
            <a
              className={styles.emailButton}
              href={`mailto:${request.email}?subject=${encodeURIComponent(
                `Your renovation estimate (${request.reference})`,
              )}`}
            >
              <Mail size={15} aria-hidden="true" />
              <span>Email</span>
            </a>
          </>
        }
      />

      {isArchived ? (
        <div className={styles.archivedBanner}>
          <Notice tone="info" title="This request is archived">
            It no longer appears in the working list. Everything about it is kept — use
            &ldquo;Bring it back&rdquo; below to return it to the pipeline.
          </Notice>
        </div>
      ) : null}

      <div className={styles.layout}>
        <div className={styles.mainColumn}>
          {/* ---- What they asked for ------------------------------------ */}
          <Panel title="What they told us">
            <blockquote className={styles.description}>{request.description}</blockquote>

            <dl className={styles.facts}>
              <Fact
                label="Project type"
                value={request.projectTypes.length > 0 ? request.projectTypes.join(', ') : null}
              />
              <Fact label="Property" value={PROPERTY_LABEL[request.propertyType] ?? request.propertyType} />
              <Fact label="Timing" value={TIMELINE_LABEL[request.timeline] ?? request.timeline} />
              <Fact label="Budget" value={BUDGET_LABEL[request.budgetRange] ?? request.budgetRange} />
              <Fact
                label="Prefers"
                value={CONTACT_LABEL[request.preferredContactMethod] ?? request.preferredContactMethod}
              />
              <Fact label="How they found us" value={request.referralSource} />
            </dl>
          </Panel>

          {/* ---- Contact ------------------------------------------------- */}
          <Panel title="Contact details">
            <dl className={styles.facts}>
              <Fact label="Email" value={<a href={`mailto:${request.email}`}>{request.email}</a>} />
              <Fact
                label="Phone"
                value={
                  request.phone ? (
                    <a href={`tel:${request.phone.replace(/[^\d+]/g, '')}`}>{request.phone}</a>
                  ) : null
                }
                missing="They did not leave a number"
              />
              <Fact label="Address" value={request.addressLine} missing="Not given" />
              <Fact label="Town or city" value={request.city} missing="Not given" />
              <Fact label="ZIP code" value={request.postalCode} />
            </dl>
          </Panel>

          {hasAttribution(request) ? (
            <Panel title="Attribution" description="First-touch acquisition details captured for this enquiry.">
              <dl className={styles.facts}>
                {request.utmSource ? <Fact label="Source" value={request.utmSource} /> : null}
                {request.utmMedium ? <Fact label="Medium" value={request.utmMedium} /> : null}
                {request.utmCampaign ? <Fact label="Campaign" value={request.utmCampaign} /> : null}
                {request.utmTerm ? <Fact label="Term" value={request.utmTerm} /> : null}
                {request.utmContent ? <Fact label="Content" value={request.utmContent} /> : null}
                {request.landingPage ? <Fact label="Landing page" value={<SafeUrl value={request.landingPage} />} /> : null}
                {request.referrerUrl ? <Fact label="Referrer" value={<SafeUrl value={request.referrerUrl} />} /> : null}
              </dl>
            </Panel>
          ) : null}

          {/* ---- Notes --------------------------------------------------- */}
          <Panel
            title="Notes"
            description="Internal only. Nothing here is ever shown on the website or sent to the customer."
          >
            <form className={styles.noteForm} onSubmit={submitNote}>
              <label className="u-visually-hidden" htmlFor="new-note">
                Add a note
              </label>
              <textarea
                id="new-note"
                className={styles.noteInput}
                value={note}
                rows={3}
                maxLength={4000}
                placeholder="Called at 2pm — wants the kitchen done before the holidays. Sending a quote Thursday."
                onChange={(event) => setNote(event.target.value)}
              />
              <div className={styles.noteActions}>
                <PrimaryButton type="submit" disabled={busy || note.trim().length === 0}>
                  Add note
                </PrimaryButton>
              </div>
            </form>

            {data.notes.length === 0 && !request.internalNotes ? (
              <p className={styles.quiet}>No notes yet.</p>
            ) : (
              <ul className={styles.noteList}>
                {data.notes.map((entry) => (
                  <li key={entry.id} className={styles.note}>
                    <div className={styles.noteHead}>
                      <span className={styles.noteAuthor}>
                        {entry.createdByDisplayName ?? 'Someone on the team'}
                      </span>
                      <span className={styles.noteTime}>{formatDateTime(entry.createdAtUtc)}</span>
                      <GhostButton
                        className={styles.noteDelete}
                        onClick={() => setNoteToDelete(entry.id)}
                        disabled={busy}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                        <span className="u-visually-hidden">Delete this note</span>
                      </GhostButton>
                    </div>
                    <p className={styles.noteBody}>{entry.note}</p>
                  </li>
                ))}

                {/*
                  A single free-text note from before the activity log existed.
                  Shown so nothing is lost, but with no timestamp claimed — we
                  do not know when it was written.
                */}
                {request.internalNotes ? (
                  <li className={styles.note}>
                    <div className={styles.noteHead}>
                      <span className={styles.noteAuthor}>Earlier note</span>
                      <span className={styles.noteTime}>Recorded before notes were dated</span>
                    </div>
                    <p className={styles.noteBody}>{request.internalNotes}</p>
                  </li>
                ) : null}
              </ul>
            )}
          </Panel>
        </div>

        {/* ---- Side column ----------------------------------------------- */}
        <div className={styles.sideColumn}>
          <Panel title="Notification">
            <NotificationState request={request} />
            {request.notificationDeliveredAtUtc === null ? (
              <SecondaryButton className={styles.fullWidth} onClick={() => void retryNotification()} disabled={busy}>
                {busy ? 'Retrying…' : 'Retry notification'}
              </SecondaryButton>
            ) : null}
          </Panel>
          <Panel title="Stage">
            <div className={styles.statusNow}>
              <Pill tone={meta.tone}>{meta.label}</Pill>
              <p className={styles.statusMeaning}>{meta.meaning}</p>
            </div>

            {statusError ? (
              <div className={styles.statusError}>
                <Notice tone="danger">{statusError}</Notice>
              </div>
            ) : null}

            {meta.next ? (
              <PrimaryButton
                className={styles.fullWidth}
                onClick={() => void changeStatus(meta.next!.status)}
                disabled={busy}
              >
                {meta.next.label}
              </PrimaryButton>
            ) : null}

            <label className={styles.statusPicker}>
              <span className={styles.statusPickerLabel}>Or move it to</span>
              <select
                className={styles.select}
                value={request.status}
                disabled={busy}
                onChange={(event) => void changeStatus(event.target.value as EstimateRequestStatus)}
              >
                {STATUS_ORDER.map((value) => (
                  <option key={value} value={value}>
                    {STATUS_META[value].label}
                  </option>
                ))}
              </select>
            </label>
          </Panel>

          <Panel title="Filing">
            {isArchived ? (
              <>
                <p className={styles.archiveNote}>
                  This request is archived. It is out of the working list, but nothing has been
                  deleted — every detail and every note is still here.
                </p>
                <PrimaryButton
                  className={styles.fullWidth}
                  onClick={() => void changeStatus('New')}
                  disabled={busy}
                >
                  <RotateCcw size={15} aria-hidden="true" />
                  Bring it back
                </PrimaryButton>
              </>
            ) : (
              <>
                <p className={styles.archiveNote}>
                  Archiving takes a request out of the working list without losing it. There is no
                  delete here on purpose — an enquiry somebody took the time to send is worth
                  keeping.
                </p>
                <SecondaryButton
                  className={styles.fullWidth}
                  onClick={() => setConfirmArchive(true)}
                  disabled={busy}
                >
                  <Archive size={15} aria-hidden="true" />
                  Archive this request
                </SecondaryButton>
              </>
            )}
          </Panel>

          <Panel title="History">
            {data.history.length === 0 ? (
              <p className={styles.quiet}>
                Nothing recorded yet. Stage changes are logged from the moment they happen — nothing
                has been filled in retrospectively.
              </p>
            ) : (
              <ol className={styles.history}>
                {data.history.map((entry) => (
                  <li key={entry.id} className={styles.historyItem}>
                    <p className={styles.historyChange}>
                      {STATUS_META[entry.previousStatus].label} → {STATUS_META[entry.newStatus].label}
                    </p>
                    <p className={styles.historyMeta}>
                      {formatDateTime(entry.changedAtUtc)}
                      {entry.changedByDisplayName ? ` · ${entry.changedByDisplayName}` : ''}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel title="Turn this into a project">
            <p className={styles.quiet}>
              Once the work is finished and you have photographs, add it to the gallery as a case
              study. Nothing is copied across automatically — a customer&rsquo;s enquiry is private,
              and a public case study is written deliberately.
            </p>
            <Link to="/admin/projects/new" className={styles.projectLink}>
              <MessageSquare size={15} aria-hidden="true" />
              <span>Start a new project</span>
            </Link>
          </Panel>
        </div>
      </div>

      <ConfirmDialog
        open={confirmArchive}
        title="Archive this request?"
        body={
          <>
            <strong>
              {request.firstName} {request.lastName}
            </strong>{' '}
            will move out of the working list. Nothing is deleted — the details, the notes and the
            history all stay, and you can bring it back at any time.
          </>
        }
        confirmLabel="Archive it"
        busy={busy}
        onCancel={() => setConfirmArchive(false)}
        onConfirm={() => {
          setConfirmArchive(false);
          void changeStatus('Archived');
        }}
      />

      <ConfirmDialog
        open={noteToDelete !== null}
        title="Delete this note?"
        body={
          <>
            The note will be <strong>permanently removed</strong>. Stage history is not affected.
          </>
        }
        confirmLabel="Delete note"
        destructive
        busy={busy}
        onCancel={() => setNoteToDelete(null)}
        onConfirm={() => {
          if (noteToDelete !== null) void removeNote(noteToDelete);
        }}
      />
    </>
  );
}

type Request = AdminEstimateRequestDetail['request'];

function hasAttribution(request: Request) {
  return Boolean(request.utmSource || request.utmMedium || request.utmCampaign || request.utmTerm || request.utmContent || request.landingPage || request.referrerUrl);
}

function SafeUrl({ value }: { value: string }) {
  let href: string | null = null;
  try {
    const url = new URL(value, window.location.origin);
    if (url.protocol === 'http:' || url.protocol === 'https:') href = url.href;
  } catch { /* Invalid or relative text is intentionally not linked. */ }
  return href ? <a href={href} target="_blank" rel="noreferrer">{value}</a> : <>{value}</>;
}

function NotificationState({ request }: { request: Request }) {
  const label = request.notificationDeliveredAtUtc ? 'Delivered' : request.notificationFailedAtUtc ? 'Failed' : 'Not yet sent';
  return <dl className={styles.facts}>
    <Fact label="State" value={label} />
    <Fact label="Attempts" value={String(request.notificationAttemptCount ?? 0)} />
    {request.notificationAttemptedAtUtc ? <Fact label="Last attempt" value={formatDateTime(request.notificationAttemptedAtUtc)} /> : null}
    {request.notificationDeliveredAtUtc ? <Fact label="Delivered" value={formatDateTime(request.notificationDeliveredAtUtc)} /> : null}
    {request.notificationFailedAtUtc ? <Fact label="Failed" value={formatDateTime(request.notificationFailedAtUtc)} /> : null}
    {request.notificationFailureCategory ? <Fact label="Category" value={request.notificationFailureCategory} /> : null}
  </dl>;
}

interface FactProps {
  label: string;
  value: React.ReactNode;
  /** Wording used when the value is absent — never a fabricated placeholder. */
  missing?: string;
}

function Fact({ label, value, missing = 'Not given' }: FactProps) {
  const empty = value === null || value === undefined || value === '';
  return (
    <div className={styles.fact}>
      <dt className={styles.factLabel}>{label}</dt>
      <dd className={empty ? styles.factMissing : styles.factValue}>{empty ? missing : value}</dd>
    </div>
  );
}
