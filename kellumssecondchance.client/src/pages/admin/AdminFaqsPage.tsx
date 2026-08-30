import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { NO_ERRORS, sameValue, orNull, slugify, toFormErrors } from './components/adminForm';
import type { FormErrors } from './components/adminForm';
import { TextArea, TextInput } from '@/components/ui/FormField';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useAsync } from '@/lib/hooks/useAsync';
import { createFaq, deleteFaq, listAdminFaqs, updateFaq } from '@/lib/api/admin';
import type { Column } from './components/AdminUi';
import type { AdminFaq, FaqWrite } from '@/lib/api/adminTypes';

interface Draft {
  question: string;
  answer: string;
  category: string;
  categorySlug: string;
  needsReview: boolean;
  reviewNote: string;
  isActive: boolean;
  displayOrder: number;
}

const EMPTY: Draft = {
  question: '',
  answer: '',
  category: '',
  categorySlug: '',
  needsReview: false,
  reviewNote: '',
  isActive: false,
  displayOrder: 0,
};

/**
 * Frequently asked questions — and the ones nobody has answered yet.
 *
 * The review gate is the important behaviour here. Several questions ("do you
 * charge for an estimate?", "what warranty do you give?") depend on a business
 * policy that only the owner can set. Rather than guessing an answer, those
 * questions are held back: they do not appear on the website and they are kept
 * out of the FAQ markup search engines read.
 *
 * The gate can only be cleared by writing a real answer — the server enforces
 * that too, so it cannot be bypassed from here.
 */
export default function AdminFaqsPage() {
  const toast = useToast();
  const [params] = useSearchParams();
  const highlight = Number(params.get('highlight') ?? '0') || null;

  const loader = useCallback((signal: AbortSignal) => listAdminFaqs(signal), []);
  const { data, status, error, reload } = useAsync(loader);

  const [editing, setEditing] = useState<AdminFaq | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminFaq | null>(null);
  const [busy, setBusy] = useState(false);

  const pending = (data ?? []).filter((faq) => faq.needsReview);

  const guard = useDirtyGuard();

  /**
   * Closing the editor — by the × , by Escape, or by clicking the backdrop.
   *
   * Routed through the shell guard so every one of those exits asks the same
   * question the Cancel button does. The form reports its own dirty state into
   * that guard, so nothing has to be passed down.
   */
  const closeEditor = () => guard.confirmDiscard(() => setEditing(null));
  const remove = async (faq: AdminFaq) => {
    setBusy(true);
    try {
      await deleteFaq(faq.id);
      toast.success('Question deleted.');
      reload();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'That question was not deleted.');
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  };

  const columns = useMemo<readonly Column<AdminFaq>[]>(
    () => [
      {
        key: 'question',
        header: 'Question',
        render: (row) => (
          <button type="button" className={styles.primaryCell} onClick={() => setEditing(row)}>
            <span className={styles.primaryText}>{row.question}</span>
            <span className={styles.secondaryText}>{row.category}</span>
          </button>
        ),
      },
      {
        key: 'answer',
        header: 'Answer',
        hideBelow: 'md',
        render: (row) =>
          row.needsReview || row.answer.trim().length === 0 ? (
            <span className={styles.awaiting}>{row.reviewNote ?? 'Waiting on your decision'}</span>
          ) : (
            <span className={styles.clamp}>{row.answer}</span>
          ),
      },
      {
        key: 'state',
        header: 'Status',
        align: 'end',
        render: (row) => (
          <span className={styles.badgeRow}>
            {row.needsReview ? (
              <Pill tone="warn">Needs your answer</Pill>
            ) : (
              <PublishPill isActive={row.isActive} />
            )}
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
            <SecondaryButton onClick={() => setEditing(row)}>
              {row.needsReview ? 'Answer' : 'Edit'}
            </SecondaryButton>
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Questions"
        lead="The FAQ page. Anything without an agreed answer stays off the website until you write one."
        actions={
          <PrimaryButton onClick={() => setEditing('new')}>
            <Plus size={15} aria-hidden="true" />
            New question
          </PrimaryButton>
        }
      />

      {pending.length > 0 ? (
        <div className={styles.noticeBlock}>
          <Notice
            tone="warn"
            title={
              pending.length === 1
                ? 'One question is waiting on a decision from you'
                : `${pending.length} questions are waiting on a decision from you`
            }
          >
            These depend on how Kellum&rsquo;s actually operates — what an estimate costs, what
            guarantee you give, how deposits work. Nothing has been invented on your behalf: they
            are withheld from the website and from search engines until you answer them.
          </Notice>
        </div>
      ) : null}

      {status === 'loading' ? (
        <LoadingState label="Loading questions" variant="inline" />
      ) : status === 'error' ? (
        <ErrorState
          title="We could not load your questions"
          description={error?.message ?? 'Your website did not answer. Check your connection and try again.'}
          onRetry={reload}
        />
      ) : (
        <Panel flush>
          <DataTable
            caption="Frequently asked questions"
            columns={columns}
            rows={data ?? []}
            rowKey={(row) => row.id}
            flagRow={(row) => row.needsReview || row.id === highlight}
            empty={
              <div className={styles.emptyInner}>
                <p className={styles.emptyTitle}>No questions yet</p>
                <p className={styles.emptyBody}>
                  Add the ones customers actually ask you on the phone. Answering them here saves
                  the same conversation ten more times.
                </p>
              </div>
            }
          />
        </Panel>
      )}

      <Dialog
        open={editing !== null}
        onClose={closeEditor}
        title={editing === 'new' ? 'New question' : 'Edit question'}
        size="md"
      >
        {editing !== null ? (
          <FaqForm
            key={editing === 'new' ? 'new' : editing.id}
            faq={editing === 'new' ? null : editing}
            onClose={closeEditor}
            onSaved={() => {
              setEditing(null);
              reload();
            }}
            onDelete={(faq) => {
              setEditing(null);
              setDeleting(faq);
            }}
          />
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this question?"
        body={
          <>
            <strong>{deleting?.question}</strong> will be removed permanently. If you only want it
            off the FAQ page, switch it off instead.
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

function FaqForm({
  faq,
  onClose,
  onSaved,
  onDelete,
}: {
  faq: AdminFaq | null;
  onClose: () => void;
  onSaved: () => void;
  onDelete: (faq: AdminFaq) => void;
}) {
  const toast = useToast();
  const [draft, setDraft] = useState<Draft>(
    faq
      ? {
          question: faq.question,
          answer: faq.answer,
          category: faq.category,
          categorySlug: faq.categorySlug,
          needsReview: faq.needsReview,
          reviewNote: faq.reviewNote ?? '',
          isActive: faq.isActive,
          displayOrder: faq.displayOrder,
        }
      : EMPTY,
  );
  const [errors, setErrors] = useState<FormErrors>(NO_ERRORS);
  const [saving, setSaving] = useState(false);
  const [categorySlugTouched, setCategorySlugTouched] = useState(false);

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

  const answerReady = draft.answer.trim().length > 0;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrors(NO_ERRORS);

    const payload: FaqWrite = {
      question: draft.question.trim(),
      answer: draft.answer.trim(),
      category: draft.category.trim(),
      categorySlug: draft.categorySlug.trim() || slugify(draft.category),
      needsReview: draft.needsReview,
      reviewNote: orNull(draft.reviewNote),
      isActive: draft.isActive,
      displayOrder: draft.displayOrder,
      rowVersion: faq?.rowVersion ?? null,
    };

    try {
      if (faq) await updateFaq(faq.id, payload);
      else await createFaq(payload);
      toast.success(faq ? 'Question saved.' : 'Question added.');
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

      {faq?.needsReview ? (
        <Notice tone="warn" title="This question has been held back">
          {faq.reviewNote ??
            'It depends on a business policy nobody has confirmed. It is not on the website and search engines have not been shown it.'}
        </Notice>
      ) : null}

      <TextInput
        label="Question"
        name="question"
        required
        maxLength={300}
        value={draft.question}
        error={errors.fields.question}
        hint="Word it the way a customer would ask it."
        onChange={(event) => set('question', event.target.value)}
      />

      <TextArea
        label="Answer"
        name="answer"
        rows={5}
        maxLength={2500}
        showCount
        value={draft.answer}
        error={errors.fields.answer}
        hint="Plain, direct, and true of how Kellum’s actually works."
        onChange={(event) => set('answer', event.target.value)}
      />

      <div className={styles.editorGrid}>
        <TextInput
          label="Group"
          name="category"
          required
          maxLength={120}
          value={draft.category}
          error={errors.fields.category}
          hint="Questions are grouped under headings, e.g. “Getting started”."
          onChange={(event) => {
            set('category', event.target.value);
            // Follows the group name until somebody edits the address itself.
            if (!categorySlugTouched) set('categorySlug', slugify(event.target.value));
          }}
        />
        <TextInput
          label="Group address"
          name="categorySlug"
          maxLength={120}
          value={draft.categorySlug}
          error={errors.fields.categorySlug}
          optionalLabel={false}
          hint="Questions in the same group must share this exactly, or the group splits in two."
          onChange={(event) => {
            setCategorySlugTouched(true);
            set('categorySlug', event.target.value);
          }}
        />

        <TextInput
          label="Position"
          name="displayOrder"
          type="number"
          min={0}
          max={10000}
          value={String(draft.displayOrder)}
          error={errors.fields.displayOrder}
          hint="Lower numbers come first within the group."
          onChange={(event) => set('displayOrder', Number(event.target.value) || 0)}
        />
      </div>

      <Switch
        label="Hold this back until a decision is made"
        description="While this is ticked the question stays off the FAQ page and out of search-engine markup, no matter what else is set."
        checked={draft.needsReview}
        onChange={(checked) => set('needsReview', checked)}
        activeNote={
          answerReady
            ? 'You have written an answer. Untick this to publish it.'
            : 'Write an answer above before you can untick this.'
        }
      />

      {draft.needsReview ? (
        <TextInput
          label="Why it is held back"
          name="reviewNote"
          maxLength={500}
          value={draft.reviewNote}
          error={errors.fields.reviewNote}
          hint="A note to yourself about the decision needed, e.g. “Confirm whether estimates are free”."
          onChange={(event) => set('reviewNote', event.target.value)}
        />
      ) : null}

      <Switch
        label="Show this question on the website"
        description={
          draft.needsReview
            ? 'This has no effect while the question is held back above.'
            : undefined
        }
        checked={draft.isActive}
        disabled={draft.needsReview}
        onChange={(checked) => set('isActive', checked)}
      />

      <div className={styles.editorActions}>
        {faq ? (
          <button
            type="button"
            className={adminUi.dangerButton}
            disabled={saving}
            onClick={() => onDelete(faq)}
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
          {saving ? 'Saving…' : faq ? 'Save changes' : 'Add question'}
        </PrimaryButton>
      </div>
    </form>
  );
}
