/**
 * The admin console's own small design system.
 *
 * The public site's components are built for marketing: generous spacing, big
 * type, motion. A console needs the opposite — density, scannability and
 * controls that sit still. These pieces are built from the same design tokens,
 * so the console still looks like Kellum's, but they are tuned for someone
 * working through twenty rows rather than reading a page.
 *
 * Everything here is presentational. No component fetches, saves or knows about
 * an endpoint.
 */

import type { ReactNode } from 'react';
import { useId, useState } from 'react';
import { Plus, X } from 'lucide-react';
import styles from './AdminUi.module.css';
import { ConfirmDialog } from './Dialog';
import { cn } from '@/lib/cn';

/* ------------------------------------------------------------ page header */

interface PageHeaderProps {
  title: string;
  lead?: ReactNode;
  actions?: ReactNode;
  /** Small text above the title, e.g. a count or a parent record. */
  eyebrow?: string;
}

export function PageHeader({ title, lead, actions, eyebrow }: PageHeaderProps) {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.pageHeaderText}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h1 className={styles.pageTitle}>{title}</h1>
        {lead ? <p className={styles.pageLead}>{lead}</p> : null}
      </div>
      {actions ? <div className={styles.pageActions}>{actions}</div> : null}
    </header>
  );
}

/* ------------------------------------------------------------------ panel */

interface PanelProps {
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Removes the inner padding, for panels whose child is a table. */
  flush?: boolean;
}

export function Panel({ title, description, actions, children, className, flush }: PanelProps) {
  return (
    <section className={cn(styles.panel, className)}>
      {title || actions ? (
        <div className={styles.panelHead}>
          <div>
            {title ? <h2 className={styles.panelTitle}>{title}</h2> : null}
            {description ? <p className={styles.panelDescription}>{description}</p> : null}
          </div>
          {actions ? <div className={styles.panelActions}>{actions}</div> : null}
        </div>
      ) : null}
      <div className={flush ? undefined : styles.panelBody}>{children}</div>
    </section>
  );
}

/* ---------------------------------------------------------------- toolbar */

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className={styles.toolbar}>{children}</div>;
}

/* ------------------------------------------------------------- data table */

export interface Column<T> {
  /** Stable key, also used for the cell's React key. */
  readonly key: string;
  readonly header: ReactNode;
  readonly render: (row: T) => ReactNode;
  /** Right-aligns the column — use for counts and actions. */
  readonly align?: 'start' | 'end';
  /** Hides the column below the given breakpoint class. */
  readonly hideBelow?: 'sm' | 'md' | 'lg';
  /** Announced but visually hidden header, for an actions column. */
  readonly headerHidden?: boolean;
}

interface DataTableProps<T> {
  readonly caption: string;
  readonly columns: readonly Column<T>[];
  readonly rows: readonly T[];
  readonly rowKey: (row: T) => string | number;
  readonly empty: ReactNode;
  /** Marks a row as needing attention — draws the left edge in the accent. */
  readonly flagRow?: (row: T) => boolean;
}

/**
 * A real <table>.
 *
 * Div grids look the same and lose everything a screen reader needs: row and
 * column relationships, a caption, and the ability to announce "column 3 of 6".
 * The caption is visually hidden but is what tells a non-sighted user what they
 * have landed in.
 */
export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  empty,
  flagRow,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <div className={styles.emptyBlock}>{empty}</div>;
  }

  return (
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <caption className="u-visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  column.align === 'end' && styles.alignEnd,
                  column.hideBelow && styles[`hide-${column.hideBelow}`],
                )}
              >
                {column.headerHidden ? (
                  <span className="u-visually-hidden">{column.header}</span>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className={cn(flagRow?.(row) && styles.rowFlagged)}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    column.align === 'end' && styles.alignEnd,
                    column.hideBelow && styles[`hide-${column.hideBelow}`],
                  )}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ pills */

export type PillTone = 'live' | 'draft' | 'warn' | 'danger' | 'info' | 'sample';

const PILL_CLASS: Record<PillTone, string> = {
  live: styles.pillLive,
  draft: styles.pillDraft,
  warn: styles.pillWarn,
  danger: styles.pillDanger,
  info: styles.pillInfo,
  sample: styles.pillSample,
};

export function Pill({ tone = 'info', children }: { tone?: PillTone; children: ReactNode }) {
  return <span className={cn(styles.pill, PILL_CLASS[tone])}>{children}</span>;
}

/** Published / draft, said in the words a business owner uses. */
export function PublishPill({ isActive }: { isActive: boolean }) {
  return <Pill tone={isActive ? 'live' : 'draft'}>{isActive ? 'On the site' : 'Draft'}</Pill>;
}

/* -------------------------------------------------------------- empty row */

interface EmptyProps {
  title: string;
  body?: ReactNode;
  action?: ReactNode;
}

export function AdminEmpty({ title, body, action }: EmptyProps) {
  return (
    <div className={styles.empty}>
      <p className={styles.emptyTitle}>{title}</p>
      {body ? <p className={styles.emptyBody}>{body}</p> : null}
      {action ? <div className={styles.emptyAction}>{action}</div> : null}
    </div>
  );
}

/* -------------------------------------------------------------- form bits */

export function FieldGrid({
  children,
  columns = 2,
}: {
  children: ReactNode;
  columns?: 1 | 2 | 3;
}) {
  return <div className={cn(styles.fieldGrid, styles[`cols${columns}`])}>{children}</div>;
}

interface FormSectionProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}

/**
 * A titled group of fields.
 *
 * Uses a real fieldset/legend so the group name is announced with every control
 * inside it — a long settings form is unusable otherwise.
 */
export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <fieldset className={styles.formSection}>
      <legend className={styles.formSectionTitle}>{title}</legend>
      {description ? <p className={styles.formSectionDescription}>{description}</p> : null}
      <div className={styles.formSectionBody}>{children}</div>
    </fieldset>
  );
}

interface SwitchProps {
  label: string;
  description?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Extra warning shown only while the box is ticked. */
  activeNote?: ReactNode;
}

/** A plain checkbox, styled. Not a div with role="switch". */
export function Switch({
  label,
  description,
  checked,
  onChange,
  disabled,
  activeNote,
}: SwitchProps) {
  const id = useId();
  const describedBy = description ? `${id}-desc` : undefined;

  return (
    <div className={styles.switchRow}>
      <input
        type="checkbox"
        id={id}
        className={styles.switchInput}
        checked={checked}
        disabled={disabled}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.checked)}
      />
      <div className={styles.switchText}>
        <label htmlFor={id} className={styles.switchLabel}>
          {label}
        </label>
        {description ? (
          <p className={styles.switchDescription} id={describedBy}>
            {description}
          </p>
        ) : null}
        {checked && activeNote ? <p className={styles.switchNote}>{activeNote}</p> : null}
      </div>
    </div>
  );
}

interface TagInputProps {
  label: string;
  hint?: ReactNode;
  values: readonly string[];
  onChange: (values: readonly string[]) => void;
  placeholder?: string;
  max?: number;
  error?: string;
}

/**
 * Free-text list editor, for things like "what this service includes".
 *
 * Enter adds, the × removes. Deliberately not a comma-separated text box: a
 * bullet with a comma in it would silently split into two.
 */
export function TagInput({
  label,
  hint,
  values,
  onChange,
  placeholder,
  max,
  error,
}: TagInputProps) {
  const id = useId();
  const [draft, setDraft] = useState('');
  const atLimit = max !== undefined && values.length >= max;

  const commit = () => {
    const value = draft.trim();
    if (!value || atLimit) return;
    if (values.includes(value)) {
      setDraft('');
      return;
    }
    onChange([...values, value]);
    setDraft('');
  };

  return (
    <div className={styles.tagField}>
      <label className={styles.tagLabel} htmlFor={id}>
        {label}
      </label>
      {hint ? (
        <p className={styles.tagHint} id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}

      {values.length > 0 ? (
        <ul className={styles.tagList}>
          {values.map((value, index) => (
            <li key={value} className={styles.tag}>
              <span className={styles.tagText}>{value}</span>
              <button
                type="button"
                className={styles.tagRemove}
                onClick={() => onChange(values.filter((_, i) => i !== index))}
              >
                <X size={13} aria-hidden="true" />
                <span className="u-visually-hidden">Remove “{value}”</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className={styles.tagEntry}>
        <input
          id={id}
          type="text"
          className={styles.tagInput}
          value={draft}
          placeholder={atLimit ? `Maximum of ${max} reached` : placeholder}
          disabled={atLimit}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            // Otherwise this submits the surrounding form.
            event.preventDefault();
            commit();
          }}
        />
        <button
          type="button"
          className={styles.tagAdd}
          onClick={commit}
          disabled={atLimit || draft.trim().length === 0}
        >
          <Plus size={14} aria-hidden="true" />
          <span>Add</span>
        </button>
      </div>

      {error ? <p className={styles.fieldError}>{error}</p> : null}
    </div>
  );
}

/* ---------------------------------------------------------------- notices */

interface NoticeProps {
  tone?: 'info' | 'warn' | 'danger' | 'success';
  title?: string;
  children: ReactNode;
}

const NOTICE_CLASS = {
  info: styles.noticeInfo,
  warn: styles.noticeWarn,
  danger: styles.noticeDanger,
  success: styles.noticeSuccess,
} as const;

export function Notice({ tone = 'info', title, children }: NoticeProps) {
  return (
    <div className={cn(styles.notice, NOTICE_CLASS[tone])} role={tone === 'danger' ? 'alert' : undefined}>
      {title ? <p className={styles.noticeTitle}>{title}</p> : null}
      <div className={styles.noticeBody}>{children}</div>
    </div>
  );
}

/* --------------------------------------------------------- error summary */

interface ErrorSummaryProps {
  /** Field name → message, as produced by toFormErrors. */
  fields: Readonly<Record<string, string>>;
  /** Human label for each field name, so the list does not read like code. */
  labels?: Readonly<Record<string, string>>;
}

/**
 * What went wrong, and where.
 *
 * The Site settings and project forms are long enough that a message attached
 * to one input can sit two screens below the save button. This lists every
 * failure at the top and scrolls to the field when one is clicked — the same
 * pattern the public estimate form already uses.
 *
 * Rendered as a focusable region so a screen reader lands on it after a failed
 * save rather than being left at the bottom of the form with no explanation.
 */
export function ErrorSummary({ fields, labels = {} }: ErrorSummaryProps) {
  const entries = Object.entries(fields);
  if (entries.length === 0) return null;

  return (
    <div className={styles.errorSummary} role="alert" tabIndex={-1}>
      <p className={styles.errorSummaryTitle}>
        {entries.length === 1
          ? 'One thing needs another look before this can be saved:'
          : `${entries.length} things need another look before this can be saved:`}
      </p>
      <ul className={styles.errorSummaryList}>
        {entries.map(([field, message]) => (
          <li key={field}>
            <button
              type="button"
              className={styles.errorSummaryLink}
              onClick={() => {
                const input = document.querySelector<HTMLElement>(`[name="${field}"]`);
                input?.scrollIntoView({ block: 'center', behavior: 'smooth' });
                input?.focus();
              }}
            >
              {labels[field] ?? message}
            </button>
            {labels[field] ? <span className={styles.errorSummaryDetail}> — {message}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------ save footer */

interface SaveBarProps {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onCancel?: () => void;
  saveLabel?: string;
  /** Rendered on the left — usually the last-saved time or a warning. */
  status?: ReactNode;
}

/**
 * Sticky footer for a long form.
 *
 * Stays reachable at the bottom of the viewport so nobody has to scroll a
 * thousand-pixel form back to the top to find the save button, and states
 * plainly whether there is anything to save.
 */
export function SaveBar({
  dirty,
  saving,
  onSave,
  onCancel,
  saveLabel = 'Save changes',
  status,
}: SaveBarProps) {
  /*
   * Discard is destructive — it throws away everything typed since the last
   * save — so it asks first, exactly like a delete. Rendered by the caller's
   * ConfirmDialog through `onCancel`, which is why the confirmation lives here
   * rather than in every form.
   */
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  return (
    <div className={styles.saveBar}>
      <p className={styles.saveStatus} aria-live="polite">
        {status ?? (dirty ? 'You have unsaved changes.' : 'Everything is saved.')}
      </p>
      <div className={styles.saveActions}>
        {onCancel ? (
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => setConfirmDiscard(true)}
            disabled={saving}
          >
            Discard
          </button>
        ) : null}
        <button
          type="submit"
          className={styles.primaryButton}
          onClick={onSave}
          disabled={saving || !dirty}
        >
          {saving ? 'Saving…' : saveLabel}
        </button>
      </div>

      <ConfirmDialog
        open={confirmDiscard}
        title="Throw away your changes?"
        body={
          <>
            Everything you have typed since the last save will be{' '}
            <strong>lost</strong>, and the form will go back to what is currently
            on the website.
          </>
        }
        confirmLabel="Throw them away"
        cancelLabel="Keep editing"
        destructive
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          onCancel?.();
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------- raw buttons */

/*
 * The marketing Button carries hover shine and motion that is wrong at console
 * density, so the console uses plain classed buttons. They are still real
 * <button> elements with visible focus.
 */

type NativeButton = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function PrimaryButton({ className, ...rest }: NativeButton) {
  return <button type="button" {...rest} className={cn(styles.primaryButton, className)} />;
}

export function SecondaryButton({ className, ...rest }: NativeButton) {
  return <button type="button" {...rest} className={cn(styles.secondaryButton, className)} />;
}

export function GhostButton({ className, ...rest }: NativeButton) {
  return <button type="button" {...rest} className={cn(styles.ghostButton, className)} />;
}

export function DangerButton({ className, ...rest }: NativeButton) {
  return <button type="button" {...rest} className={cn(styles.dangerButton, className)} />;
}
