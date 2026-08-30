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
  TagInput,
} from './components/AdminUi';
import adminUi from './components/AdminUi.module.css';
import { ConfirmDialog, Dialog } from './components/Dialog';
import { useDirtyGuard, useToast } from './components/adminFeedback';
import { useEditorGuard } from './components/useEditorGuard';
import { NO_ERRORS, sameValue, orNull, toFormErrors } from './components/adminForm';
import type { FormErrors } from './components/adminForm';
import { TextArea, TextInput } from '@/components/ui/FormField';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useAsync } from '@/lib/hooks/useAsync';
import {
  createServiceArea,
  deleteServiceArea,
  listAdminServiceAreas,
  updateServiceArea,
} from '@/lib/api/admin';
import type { Column } from './components/AdminUi';
import type { AdminServiceArea, ServiceAreaWrite } from '@/lib/api/adminTypes';
import type { ServiceAreaKind } from '@/lib/api/types';

const KINDS: readonly { value: ServiceAreaKind; label: string }[] = [
  { value: 'City', label: 'Town or city' },
  { value: 'County', label: 'County' },
  { value: 'Region', label: 'Wider region' },
  { value: 'PostalCode', label: 'Specific ZIP codes' },
];

interface Draft {
  name: string;
  kind: ServiceAreaKind;
  stateOrRegion: string;
  postalCodes: readonly string[];
  isPrimary: boolean;
  note: string;
  isActive: boolean;
  displayOrder: number;
}

const EMPTY: Draft = {
  name: '',
  kind: 'City',
  stateOrRegion: '',
  postalCodes: [],
  isPrimary: false,
  note: '',
  isActive: true,
  displayOrder: 0,
};

/**
 * Where Kellum's works.
 *
 * The seeded entries are deliberately generic stand-ins: nobody has told this
 * application which towns the business actually covers, and inventing a
 * coverage map would send somebody a false promise. While any stand-in is still
 * present, the public page says coverage is being confirmed rather than listing
 * places nobody has agreed to.
 *
 * Editing a stand-in clears that flag — the moment a real place is typed in, it
 * stops being a placeholder.
 */
export default function AdminServiceAreasPage() {
  const toast = useToast();
  const loader = useCallback((signal: AbortSignal) => listAdminServiceAreas(signal), []);
  const { data, status, error, reload } = useAsync(loader);

  const [editing, setEditing] = useState<AdminServiceArea | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminServiceArea | null>(null);
  const [busy, setBusy] = useState(false);

  const placeholders = (data ?? []).filter((area) => area.isSampleContent && area.isActive).length;

  const guard = useDirtyGuard();

  /**
   * Closing the editor — by the × , by Escape, or by clicking the backdrop.
   *
   * Routed through the shell guard so every one of those exits asks the same
   * question the Cancel button does. The form reports its own dirty state into
   * that guard, so nothing has to be passed down.
   */
  const closeEditor = () => guard.confirmDiscard(() => setEditing(null));
  const remove = async (area: AdminServiceArea) => {
    setBusy(true);
    try {
      await deleteServiceArea(area.id);
      toast.success('Service area removed.');
      reload();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'That area was not removed.');
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  };

  const columns = useMemo<readonly Column<AdminServiceArea>[]>(
    () => [
      {
        key: 'name',
        header: 'Area',
        render: (row) => (
          <button type="button" className={styles.primaryCell} onClick={() => setEditing(row)}>
            <span className={styles.primaryText}>{row.name}</span>
            <span className={styles.secondaryText}>
              {KINDS.find((k) => k.value === row.kind)?.label ?? row.kind}
              {row.stateOrRegion ? ` · ${row.stateOrRegion}` : ''}
            </span>
          </button>
        ),
      },
      {
        key: 'ZIP codes',
        header: 'ZIP codes',
        hideBelow: 'md',
        render: (row) =>
          row.postalCodes.length > 0 ? (
            <span className={styles.clamp}>{row.postalCodes.join(', ')}</span>
          ) : (
            <span className={styles.muted}>—</span>
          ),
      },
      {
        key: 'note',
        header: 'Note',
        hideBelow: 'lg',
        render: (row) => <span className={styles.clamp}>{row.note ?? ''}</span>,
      },
      {
        key: 'state',
        header: 'Status',
        align: 'end',
        render: (row) => (
          <span className={styles.badgeRow}>
            {row.isSampleContent ? <Pill tone="sample">Stand-in</Pill> : null}
            {row.isPrimary ? <Pill tone="info">Main area</Pill> : null}
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
        title="Service areas"
        lead="The places Kellum’s will travel to. This is what the “Where we work” page lists."
        actions={
          <PrimaryButton onClick={() => setEditing('new')}>
            <Plus size={15} aria-hidden="true" />
            Add an area
          </PrimaryButton>
        }
      />

      {placeholders > 0 ? (
        <div className={styles.noticeBlock}>
          <Notice tone="warn" title="Your coverage is still using stand-in entries">
            Nobody has told this website which towns you actually cover, so the seeded entries are
            placeholders and the public page says coverage is being confirmed. Replace them with
            real places and the page starts listing them properly.
          </Notice>
        </div>
      ) : null}

      {status === 'loading' ? (
        <LoadingState label="Loading service areas" variant="inline" />
      ) : status === 'error' ? (
        <ErrorState
          title="We could not load your service areas"
          description={error?.message ?? 'Your website did not answer. Check your connection and try again.'}
          onRetry={reload}
        />
      ) : (
        <Panel flush>
          <DataTable
            caption="Service areas"
            columns={columns}
            rows={data ?? []}
            rowKey={(row) => row.id}
            flagRow={(row) => row.isSampleContent}
            empty={
              <div className={styles.emptyInner}>
                <p className={styles.emptyTitle}>No service areas listed</p>
                <p className={styles.emptyBody}>
                  Add the towns and counties you will travel to. While this list is empty the
                  website asks visitors to get in touch and ask, rather than guessing.
                </p>
                <p className={styles.emptyAction}>
                  <PrimaryButton onClick={() => setEditing('new')}>
                    <Plus size={15} aria-hidden="true" />
                    Add an area
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
        title={editing === 'new' ? 'Add a service area' : 'Edit service area'}
        size="md"
      >
        {editing !== null ? (
          <ServiceAreaForm
            key={editing === 'new' ? 'new' : editing.id}
            area={editing === 'new' ? null : editing}
            onClose={closeEditor}
            onSaved={() => {
              setEditing(null);
              reload();
            }}
            onDelete={(area) => {
              setEditing(null);
              setDeleting(area);
            }}
          />
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        title="Remove this area?"
        body={
          <>
            <strong>{deleting?.name}</strong> will no longer be listed as somewhere you work.
          </>
        }
        confirmLabel="Remove"
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

function ServiceAreaForm({
  area,
  onClose,
  onSaved,
  onDelete,
}: {
  area: AdminServiceArea | null;
  onClose: () => void;
  onSaved: () => void;
  onDelete: (area: AdminServiceArea) => void;
}) {
  const toast = useToast();
  const [draft, setDraft] = useState<Draft>(
    area
      ? {
          name: area.name,
          kind: area.kind,
          stateOrRegion: area.stateOrRegion ?? '',
          postalCodes: area.postalCodes,
          isPrimary: area.isPrimary,
          note: area.note ?? '',
          isActive: area.isActive,
          displayOrder: area.displayOrder,
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

    const payload: ServiceAreaWrite = {
      name: draft.name.trim(),
      kind: draft.kind,
      stateOrRegion: orNull(draft.stateOrRegion),
      postalCodes: draft.postalCodes,
      isPrimary: draft.isPrimary,
      note: orNull(draft.note),
      isActive: draft.isActive,
      displayOrder: draft.displayOrder,
    };

    try {
      if (area) await updateServiceArea(area.id, payload);
      else await createServiceArea(payload);
      toast.success(area ? 'Service area saved.' : 'Service area added.');
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

      {area?.isSampleContent ? (
        <Notice tone="warn" title="This is a stand-in entry">
          Saving real details here turns it into a genuine service area, and the placeholder warning
          on the public page goes away once none are left.
        </Notice>
      ) : null}

      <TextInput
        label="Name"
        name="name"
        required
        maxLength={120}
        value={draft.name}
        error={errors.fields.name}
        hint="The town, county or region as somebody local would say it."
        onChange={(event) => set('name', event.target.value)}
      />

      <div className={styles.editorGrid}>
        <label className={styles.selectField}>
          <span className={styles.selectLabel}>Kind</span>
          <select
            className={styles.select}
            value={draft.kind}
            onChange={(event) => set('kind', event.target.value as ServiceAreaKind)}
          >
            {KINDS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <TextInput
          label="State or wider region"
          name="stateOrRegion"
          maxLength={80}
          value={draft.stateOrRegion}
          error={errors.fields.stateOrRegion}
          onChange={(event) => set('stateOrRegion', event.target.value)}
        />
      </div>

      <TagInput
        label="ZIP codes covered"
        hint="Optional. Adding them lets a visitor check their own ZIP code. Press Enter after each."
        values={draft.postalCodes}
        max={200}
        placeholder="45150"
        error={errors.fields.postalCodes}
        onChange={(values) => set('postalCodes', values)}
      />

      <TextArea
        label="Note"
        name="note"
        rows={2}
        maxLength={300}
        value={draft.note}
        error={errors.fields.note}
        hint="Anything a visitor should know, e.g. “Travel charge applies beyond 30 miles”."
        onChange={(event) => set('note', event.target.value)}
      />

      <div className={styles.editorGrid}>
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
        label="This is one of our main areas"
        description="Main areas are listed first and shown more prominently."
        checked={draft.isPrimary}
        onChange={(checked) => set('isPrimary', checked)}
      />
      <Switch
        label="Show this area on the website"
        checked={draft.isActive}
        onChange={(checked) => set('isActive', checked)}
      />

      <div className={styles.editorActions}>
        {area ? (
          <button
            type="button"
            className={adminUi.dangerButton}
            disabled={saving}
            onClick={() => onDelete(area)}
          >
            <Trash2 size={15} aria-hidden="true" />
            Remove
          </button>
        ) : null}
        <span className={styles.editorSpacer} />
        <SecondaryButton onClick={requestClose} disabled={saving}>
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={saving}>
          {saving ? 'Saving…' : area ? 'Save changes' : 'Add area'}
        </PrimaryButton>
      </div>
    </form>
  );
}
