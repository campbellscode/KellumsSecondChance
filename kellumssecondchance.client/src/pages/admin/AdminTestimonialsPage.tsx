import { useCallback, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import styles from './AdminListPages.module.css';
import {
  DataTable,
  Notice,
  PageHeader,
  Panel,
  Pill,
  PrimaryButton,
  PublishPill,
  SecondaryButton,
  Switch,
} from './components/AdminUi';
import adminUi from './components/AdminUi.module.css';
import { ConfirmDialog, Dialog } from './components/Dialog';
import { useDirtyGuard, useToast } from './components/adminFeedback';
import { useEditorGuard } from './components/useEditorGuard';
import { NO_ERRORS, sameValue, formatDate, orNull, toDateInput, toFormErrors } from './components/adminForm';
import type { FormErrors } from './components/adminForm';
import { TextArea, TextInput } from '@/components/ui/FormField';
import { StarRating } from '@/components/ui/StarRating';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useAsync } from '@/lib/hooks/useAsync';
import {
  createTestimonial,
  deleteTestimonial,
  listAdminTestimonials,
  updateTestimonial,
} from '@/lib/api/admin';
import type { Column } from './components/AdminUi';
import type { AdminTestimonial, TestimonialSource, TestimonialWrite } from '@/lib/api/adminTypes';

const SOURCES: readonly { value: TestimonialSource; label: string }[] = [
  { value: 'Direct', label: 'Told us directly' },
  { value: 'Google', label: 'Google review' },
  { value: 'Facebook', label: 'Facebook review' },
  { value: 'Other', label: 'Somewhere else' },
];

interface Draft {
  firstName: string;
  lastInitial: string;
  location: string;
  rating: number;
  quote: string;
  projectCategory: string;
  reviewedOn: string;
  isFeatured: boolean;
  isActive: boolean;
  displayOrder: number;
  source: TestimonialSource;
}

const EMPTY: Draft = {
  firstName: '',
  lastInitial: '',
  location: '',
  rating: 5,
  quote: '',
  projectCategory: '',
  reviewedOn: '',
  isFeatured: false,
  isActive: false,
  displayOrder: 0,
  source: 'Direct',
};

/**
 * Customer reviews.
 *
 * The single most important rule in this application lives on this screen: a
 * review is somebody else's words, and the console must never make it easy to
 * invent one. There is no "generate", no suggestion, no template — the quote
 * box starts empty every time, and anything seeded as an example is labelled as
 * an example wherever it appears.
 */
export default function AdminTestimonialsPage() {
  const toast = useToast();
  const loader = useCallback((signal: AbortSignal) => listAdminTestimonials(signal), []);
  const { data, status, error, reload } = useAsync(loader);

  const [editing, setEditing] = useState<AdminTestimonial | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminTestimonial | null>(null);
  const [busy, setBusy] = useState(false);

  const sampleCount = (data ?? []).filter((t) => t.isSampleContent && t.isActive).length;

  const guard = useDirtyGuard();

  /**
   * Closing the editor — by the × , by Escape, or by clicking the backdrop.
   *
   * Routed through the shell guard so every one of those exits asks the same
   * question the Cancel button does. The form reports its own dirty state into
   * that guard, so nothing has to be passed down.
   */
  const closeEditor = () => guard.confirmDiscard(() => setEditing(null));
  const remove = async (testimonial: AdminTestimonial) => {
    setBusy(true);
    try {
      await deleteTestimonial(testimonial.id);
      toast.success('Review deleted.');
      reload();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'That review was not deleted.');
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  };

  const columns = useMemo<readonly Column<AdminTestimonial>[]>(
    () => [
      {
        key: 'person',
        header: 'Customer',
        render: (row) => (
          <button type="button" className={styles.primaryCell} onClick={() => setEditing(row)}>
            <span className={styles.primaryText}>
              {row.firstName}
              {row.lastInitial ? ` ${row.lastInitial}.` : ''}
            </span>
            <span className={styles.secondaryText}>
              {row.location ?? 'No location given'}
              {row.projectCategory ? ` · ${row.projectCategory}` : ''}
            </span>
          </button>
        ),
      },
      {
        key: 'quote',
        header: 'What they said',
        hideBelow: 'md',
        render: (row) => <span className={styles.clamp}>{row.quote}</span>,
      },
      {
        key: 'rating',
        header: 'Rating',
        hideBelow: 'sm',
        render: (row) => <StarRating value={row.rating} size={14} hideLabel />,
      },
      {
        key: 'reviewed',
        header: 'Dated',
        hideBelow: 'lg',
        render: (row) => <span className={styles.muted}>{formatDate(row.reviewedOn)}</span>,
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
        key: 'actions',
        header: 'Actions',
        headerHidden: true,
        align: 'end',
        render: (row) => (
          <span className={styles.rowActions}>
            <SecondaryButton onClick={() => setEditing(row)}>Edit</SecondaryButton>
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Reviews"
        lead="What customers have actually said. Only publish words a real person gave you."
        actions={
          <PrimaryButton onClick={() => setEditing('new')}>
            <Plus size={15} aria-hidden="true" />
            Add a review
          </PrimaryButton>
        }
      />

      {sampleCount > 0 ? (
        <div className={styles.noticeBlock}>
          <Notice tone="warn" title="Written examples are still showing">
            {sampleCount === 1 ? 'One review is' : `${sampleCount} reviews are`} marked as an
            example. They are clearly labelled as illustrations on the website and are kept out of
            search-engine review markup — but they are not real customers. Replace them with real
            ones when you have them, or switch them off.
          </Notice>
        </div>
      ) : null}

      {status === 'loading' ? (
        <LoadingState label="Loading reviews" variant="inline" />
      ) : status === 'error' ? (
        <ErrorState
          title="We could not load your reviews"
          description={error?.message ?? 'Your website did not answer. Check your connection and try again.'}
          onRetry={reload}
        />
      ) : (
        <Panel flush>
          <DataTable
            caption="Customer reviews"
            columns={columns}
            rows={data ?? []}
            rowKey={(row) => row.id}
            flagRow={(row) => row.isSampleContent}
            empty={
              <div className={styles.emptyInner}>
                <p className={styles.emptyTitle}>No reviews yet</p>
                <p className={styles.emptyBody}>
                  Add one when a customer gives you feedback — an email, a text, a card. Type their
                  words, not a version of them.
                </p>
                <p className={styles.emptyAction}>
                  <PrimaryButton onClick={() => setEditing('new')}>
                    <Plus size={15} aria-hidden="true" />
                    Add a review
                  </PrimaryButton>
                </p>
              </div>
            }
          />
        </Panel>
      )}

      <Dialog
        open={editing !== null}
        onClose={closeEditor}
        title={editing === 'new' ? 'Add a review' : 'Edit review'}
        size="md"
      >
        {editing !== null ? (
          <TestimonialForm
            key={editing === 'new' ? 'new' : editing.id}
            testimonial={editing === 'new' ? null : editing}
            onClose={closeEditor}
            onSaved={() => {
              setEditing(null);
              reload();
            }}
            onDelete={(testimonial) => {
              setEditing(null);
              setDeleting(testimonial);
            }}
          />
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this review?"
        body={
          <>
            The review from <strong>{deleting?.firstName}</strong> will be permanently removed. If
            you only want it off the website, switch it off instead.
          </>
        }
        confirmLabel="Delete permanently"
        destructive
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) void remove(deleting);
        }}
      />
    </>
  );
}

function TestimonialForm({
  testimonial,
  onClose,
  onSaved,
  onDelete,
}: {
  testimonial: AdminTestimonial | null;
  onClose: () => void;
  onSaved: () => void;
  onDelete: (testimonial: AdminTestimonial) => void;
}) {
  const toast = useToast();
  const [draft, setDraft] = useState<Draft>(
    testimonial
      ? {
          firstName: testimonial.firstName,
          lastInitial: testimonial.lastInitial ?? '',
          location: testimonial.location ?? '',
          rating: testimonial.rating,
          quote: testimonial.quote,
          projectCategory: testimonial.projectCategory ?? '',
          reviewedOn: toDateInput(testimonial.reviewedOn),
          isFeatured: testimonial.isFeatured,
          isActive: testimonial.isActive,
          displayOrder: testimonial.displayOrder,
          source: testimonial.source,
        }
      : EMPTY,
  );
  const [errors, setErrors] = useState<FormErrors>(NO_ERRORS);
  const [saving, setSaving] = useState(false);

  /*
   * Unsaved-change protection.
   *
   * `baseline` is what the record looked like when the dialog opened, captured
   * once with a lazy initialiser so it does not drift as the form is typed in.
   */
  const [baseline] = useState<Draft>(() => draft);
  const dirty = !sameValue(draft, baseline);
  const { requestClose } = useEditorGuard(dirty, onClose);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrors(NO_ERRORS);

    const payload: TestimonialWrite = {
      firstName: draft.firstName.trim(),
      lastInitial: orNull(draft.lastInitial),
      location: orNull(draft.location),
      rating: draft.rating,
      quote: draft.quote.trim(),
      projectCategory: orNull(draft.projectCategory),
      reviewedOn: orNull(draft.reviewedOn),
      isFeatured: draft.isFeatured,
      isActive: draft.isActive,
      displayOrder: draft.displayOrder,
      source: draft.source,
    };

    try {
      if (testimonial) await updateTestimonial(testimonial.id, payload);
      else await createTestimonial(payload);
      toast.success(
        draft.isActive
          ? testimonial
            ? 'Review saved and visible on the website.'
            : 'Review added and visible on the website.'
          : testimonial
            ? 'Review saved as hidden from the website.'
            : 'Review added as hidden from the website.',
      );
      onSaved();
    } catch (caught) {
      const formErrors = toFormErrors(caught);
      setErrors(formErrors);
      toast.error(formErrors.summary ?? 'Some of those details need another look.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={styles.editorForm} onSubmit={save}>
      {errors.summary ? <p className={styles.editorSummary}>{errors.summary}</p> : null}

      {testimonial?.isSampleContent ? (
        <Notice tone="warn" title="This is a written example">
          It is labelled as an illustration everywhere it appears and is excluded from review markup
          for search engines. Editing it does not make it a real review.
        </Notice>
      ) : null}

      <Notice tone="info">
        Type what the customer actually said. Tidying up spelling is fine; rewriting the sentiment is
        not — a review is their words, not yours.
      </Notice>

      <TextArea
        label="Their words"
        name="quote"
        required
        rows={5}
        maxLength={1500}
        showCount
        value={draft.quote}
        error={errors.fields.quote}
        onChange={(event) => set('quote', event.target.value)}
      />

      <div className={styles.editorGrid}>
        <TextInput
          label="First name"
          name="firstName"
          required
          maxLength={80}
          value={draft.firstName}
          error={errors.fields.firstName}
          onChange={(event) => set('firstName', event.target.value)}
        />
        <TextInput
          label="Last initial"
          name="lastInitial"
          maxLength={4}
          value={draft.lastInitial}
          error={errors.fields.lastInitial}
          hint="Just the letter. Full surnames are rarely wanted by customers."
          onChange={(event) => set('lastInitial', event.target.value)}
        />
      </div>

      <div className={styles.editorGrid}>
        <TextInput
          label="Where they are"
          name="location"
          maxLength={120}
          value={draft.location}
          error={errors.fields.location}
          hint="Leave blank rather than guessing."
          onChange={(event) => set('location', event.target.value)}
        />
        <TextInput
          label="What the job was"
          name="projectCategory"
          maxLength={120}
          value={draft.projectCategory}
          error={errors.fields.projectCategory}
          hint="e.g. “Kitchen Remodeling”. Used for the filter on the reviews page."
          onChange={(event) => set('projectCategory', event.target.value)}
        />
      </div>

      <div className={styles.editorGrid}>
        <label className={styles.selectField}>
          <span className={styles.selectLabel}>Rating</span>
          <select
            className={styles.select}
            value={String(draft.rating)}
            onChange={(event) => set('rating', Number(event.target.value))}
          >
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {value} {value === 1 ? 'star' : 'stars'}
              </option>
            ))}
          </select>
          <span className={styles.selectHint}>
            Only set this if they actually gave a rating. Making one up is inventing a review.
          </span>
        </label>

        <label className={styles.selectField}>
          <span className={styles.selectLabel}>Where it came from</span>
          <select
            className={styles.select}
            value={draft.source}
            onChange={(event) => set('source', event.target.value as TestimonialSource)}
          >
            {SOURCES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className={styles.selectHint}>
            Recorded for your own reference. Reviews are never scraped from anywhere.
          </span>
        </label>
      </div>

      <div className={styles.editorGrid}>
        <TextInput
          label="Date given"
          name="reviewedOn"
          type="date"
          value={draft.reviewedOn}
          error={errors.fields.reviewedOn}
          hint="Leave blank if you are not sure."
          onChange={(event) => set('reviewedOn', event.target.value)}
        />
        <TextInput
          label="Position in the list"
          name="displayOrder"
          type="number"
          min={0}
          max={10000}
          value={String(draft.displayOrder)}
          error={errors.fields.displayOrder}
          onChange={(event) => set('displayOrder', Number(event.target.value) || 0)}
        />
      </div>

      <Switch
        label="Show this review on the website"
        description="New reviews start hidden. Turn this on before saving to publish the review on the public Reviews page."
        checked={draft.isActive}
        onChange={(checked) => set('isActive', checked)}
      />
      <Switch
        label="Feature it on the homepage"
        checked={draft.isFeatured}
        onChange={(checked) => set('isFeatured', checked)}
      />

      <div className={styles.editorActions}>
        {testimonial ? (
          <button
            type="button"
            className={adminUi.dangerButton}
            disabled={saving}
            onClick={() => onDelete(testimonial)}
          >
            <Trash2 size={15} aria-hidden="true" />
            Delete
          </button>
        ) : null}
        <span className={styles.editorSpacer} />
        <SecondaryButton onClick={requestClose} disabled={saving}>
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={saving}>
          {saving ? 'Saving…' : testimonial ? 'Save changes' : 'Add review'}
        </PrimaryButton>
      </div>
    </form>
  );
}
