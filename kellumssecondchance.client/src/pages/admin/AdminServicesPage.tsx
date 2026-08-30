import { useCallback, useMemo, useState } from 'react';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import styles from './AdminListPages.module.css';
import {
  DataTable,
  Notice,
  PageHeader,
  Panel,
  Pill,
  PublishPill,
  PrimaryButton,
  SecondaryButton,
  Switch,
  TagInput,
} from './components/AdminUi';
import adminUi from './components/AdminUi.module.css';
import { ConfirmDialog, Dialog } from './components/Dialog';
import { ImageUploadField } from './components/ImageUploadField';
import { useDirtyGuard, useToast } from './components/adminFeedback';
import { useEditorGuard } from './components/useEditorGuard';
import { NO_ERRORS, orNull, sameValue, slugify, toFormErrors } from './components/adminForm';
import type { FormErrors } from './components/adminForm';
import { SERVICE_ICONS } from './serviceIcons';
import { TextArea, TextInput } from '@/components/ui/FormField';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useAsync } from '@/lib/hooks/useAsync';
import {
  createService,
  deleteService,
  deleteServiceImage,
  listAdminServices,
  updateService,
  uploadServiceImage,
} from '@/lib/api/admin';
import type { Column } from './components/AdminUi';
import type { AdminService, ServiceWrite } from '@/lib/api/adminTypes';

interface Draft {
  name: string;
  slug: string;
  tagline: string;
  summary: string;
  icon: string;
  headline: string;
  introduction: string;
  includes: readonly string[];
  bestFor: readonly string[];
  considerations: readonly string[];
  isFeatured: boolean;
  isActive: boolean;
  displayOrder: number;
  metaTitle: string;
  metaDescription: string;
}

const EMPTY: Draft = {
  name: '',
  slug: '',
  tagline: '',
  summary: '',
  icon: SERVICE_ICONS[0]!.value,
  headline: '',
  introduction: '',
  includes: [],
  bestFor: [],
  considerations: [],
  isFeatured: false,
  isActive: false,
  displayOrder: 0,
  metaTitle: '',
  metaDescription: '',
};

function toDraft(service: AdminService): Draft {
  return {
    name: service.name,
    slug: service.slug,
    tagline: service.tagline,
    summary: service.summary,
    icon: service.icon,
    headline: service.headline,
    introduction: service.introduction,
    includes: service.includes,
    bestFor: service.bestFor,
    considerations: service.considerations,
    isFeatured: service.isFeatured,
    isActive: service.isActive,
    displayOrder: service.displayOrder,
    metaTitle: service.metaTitle ?? '',
    metaDescription: service.metaDescription ?? '',
  };
}

/**
 * The service catalogue.
 *
 * A service is a claim about what the business does, so the console never
 * invents one: the list starts from what was seeded and is edited deliberately.
 * Switching one off is the safe way to stop offering it — deleting is blocked
 * whenever projects still reference it.
 */
export default function AdminServicesPage() {
  const toast = useToast();
  const loader = useCallback((signal: AbortSignal) => listAdminServices(signal), []);
  const { data, status, error, reload } = useAsync(loader);

  const [editing, setEditing] = useState<AdminService | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminService | null>(null);
  const [busy, setBusy] = useState(false);

  const guard = useDirtyGuard();

  /**
   * Closing the editor — by the × , by Escape, or by clicking the backdrop.
   *
   * Routed through the shell guard so every one of those exits asks the same
   * question the Cancel button does. The form reports its own dirty state into
   * that guard, so nothing has to be passed down.
   */
  const closeEditor = () => guard.confirmDiscard(() => setEditing(null));
  const remove = async (service: AdminService) => {
    setBusy(true);
    try {
      await deleteService(service.id);
      toast.success(`“${service.name}” deleted.`);
      reload();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'That service was not deleted.');
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  };

  const columns = useMemo<readonly Column<AdminService>[]>(
    () => [
      {
        key: 'name',
        header: 'Service',
        render: (row) => (
          <button type="button" className={styles.primaryCell} onClick={() => setEditing(row)}>
            <span className={styles.primaryText}>{row.name}</span>
            <span className={styles.secondaryText}>{row.tagline}</span>
          </button>
        ),
      },
      {
        key: 'summary',
        header: 'Summary',
        hideBelow: 'lg',
        render: (row) => <span className={styles.clamp}>{row.summary}</span>,
      },
      {
        key: 'projects',
        header: 'Projects',
        hideBelow: 'sm',
        align: 'end',
        render: (row) => <span className={styles.count}>{row.linkedProjectCount}</span>,
      },
      {
        key: 'state',
        header: 'Status',
        align: 'end',
        render: (row) => (
          <span className={styles.badgeRow}>
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
            {row.isActive ? (
              <a
                className={adminUi.ghostButton}
                href={`/services/${row.slug}`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={14} aria-hidden="true" />
                <span className="u-visually-hidden">View {row.name} on the website</span>
              </a>
            ) : null}
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
        title="Services"
        lead="What Kellum’s offers. Each service is a page on the website and an option on the estimate form."
        actions={
          <PrimaryButton onClick={() => setEditing('new')}>
            <Plus size={15} aria-hidden="true" />
            New service
          </PrimaryButton>
        }
      />

      {status === 'loading' ? (
        <LoadingState label="Loading services" variant="inline" />
      ) : status === 'error' ? (
        <ErrorState
          title="We could not load your services"
          description={error?.message ?? 'Your website did not answer. Check your connection and try again.'}
          onRetry={reload}
        />
      ) : (
        <Panel flush>
          <DataTable
            caption="Services"
            columns={columns}
            rows={data ?? []}
            rowKey={(row) => row.id}
            empty={
              <div className={styles.emptyInner}>
                <p className={styles.emptyTitle}>No services yet</p>
                <p className={styles.emptyBody}>
                  Add the work you actually take on. Only add something you are genuinely offering —
                  a service listed here is a promise to a visitor.
                </p>
                <p className={styles.emptyAction}>
                  <PrimaryButton onClick={() => setEditing('new')}>
                    <Plus size={15} aria-hidden="true" />
                    New service
                  </PrimaryButton>
                </p>
              </div>
            }
          />
        </Panel>
      )}

      <ServiceEditor
        target={editing}
        onClose={closeEditor}
        onSaved={() => {
          setEditing(null);
          reload();
        }}
        onDelete={(service) => {
          setEditing(null);
          setDeleting(service);
        }}
        /*
          A photograph is saved the moment it uploads, separately from the form.
          Reloading the list keeps the row's preview honest without closing the
          editor and losing whatever else is being typed.
        */
        onImageChanged={reload}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this service?"
        body={
          <>
            <strong>{deleting?.name}</strong> and its page will be removed permanently. If you only
            want to stop offering it, close this and switch it off instead — that keeps the page out
            of the site without losing the words.
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

/* ------------------------------------------------------------------ editor */

interface EditorProps {
  target: AdminService | 'new' | null;
  onClose: () => void;
  onSaved: () => void;
  onDelete: (service: AdminService) => void;
  onImageChanged: () => void;
}

function ServiceEditor({ target, onClose, onSaved, onDelete, onImageChanged }: EditorProps) {
  const isNew = target === 'new';
  const service = isNew || target === null ? null : target;

  return (
    <Dialog
      open={target !== null}
      onClose={onClose}
      title={isNew ? 'New service' : `Edit ${service?.name ?? 'service'}`}
      size="lg"
    >
      {target !== null ? (
        <ServiceForm
          key={service?.id ?? 'new'}
          service={service}
          onClose={onClose}
          onSaved={onSaved}
          onDelete={onDelete}
          onImageChanged={onImageChanged}
        />
      ) : null}
    </Dialog>
  );
}

function ServiceForm({
  service,
  onClose,
  onSaved,
  onDelete,
  onImageChanged,
}: {
  service: AdminService | null;
  onClose: () => void;
  onSaved: () => void;
  onDelete: (service: AdminService) => void;
  onImageChanged: () => void;
}) {
  const toast = useToast();
  const [draft, setDraft] = useState<Draft>(service ? toDraft(service) : EMPTY);
  const [errors, setErrors] = useState<FormErrors>(NO_ERRORS);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

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

  const previewSlug = service ? draft.slug : slugTouched ? draft.slug : slugify(draft.name);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrors(NO_ERRORS);

    const payload: ServiceWrite = {
      name: draft.name.trim(),
      ...(service && !slugTouched ? {} : { slug: orNull(previewSlug) }),
      tagline: draft.tagline.trim(),
      summary: draft.summary.trim(),
      icon: draft.icon,
      headline: draft.headline.trim(),
      introduction: draft.introduction.trim(),
      includes: draft.includes,
      bestFor: draft.bestFor,
      considerations: draft.considerations,
      isFeatured: draft.isFeatured,
      isActive: draft.isActive,
      displayOrder: draft.displayOrder,
      metaTitle: orNull(draft.metaTitle),
      metaDescription: orNull(draft.metaDescription),
      rowVersion: service?.rowVersion ?? null,
    };

    try {
      if (service) await updateService(service.id, payload);
      else await createService(payload);
      toast.success(service ? 'Service saved.' : 'Service created.');
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

      <div className={styles.editorGrid}>
        <TextInput
          label="Name"
          name="name"
          required
          maxLength={120}
          value={draft.name}
          error={errors.fields.name}
          onChange={(event) => set('name', event.target.value)}
        />
        <TextInput
          label="Short line"
          name="tagline"
          required
          maxLength={160}
          value={draft.tagline}
          error={errors.fields.tagline}
          hint="Shown on the card, under the name."
          onChange={(event) => set('tagline', event.target.value)}
        />
      </div>

      <TextInput
        label="Web address"
        name="slug"
        maxLength={100}
        value={previewSlug}
        error={errors.fields.slug}
        optionalLabel={false}
        hint={
          service
            ? 'Changing this moves the page. Anyone with the old link gets a “not found”.'
            : 'Filled in from the name.'
        }
        onChange={(event) => {
          setSlugTouched(true);
          set('slug', event.target.value);
        }}
      />
      <p className={styles.slugPreview}>/services/{previewSlug || '…'}</p>

      <TextArea
        label="Summary"
        name="summary"
        required
        rows={3}
        maxLength={500}
        showCount
        value={draft.summary}
        error={errors.fields.summary}
        hint="One or two sentences for the services list and search results."
        onChange={(event) => set('summary', event.target.value)}
      />

      <div className={styles.editorGrid}>
        <TextInput
          label="Page headline"
          name="headline"
          required
          maxLength={200}
          value={draft.headline}
          error={errors.fields.headline}
          hint="The big heading at the top of this service’s own page."
          onChange={(event) => set('headline', event.target.value)}
        />

        <label className={styles.iconField}>
          <span className={styles.iconLabel}>Icon</span>
          <select
            className={styles.iconSelect}
            value={draft.icon}
            onChange={(event) => set('icon', event.target.value)}
          >
            {SERVICE_ICONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.fields.icon ? <span className={styles.fieldError}>{errors.fields.icon}</span> : null}
        </label>
      </div>

      <TextArea
        label="Introduction"
        name="introduction"
        required
        rows={4}
        maxLength={2000}
        showCount
        value={draft.introduction}
        error={errors.fields.introduction}
        hint="The opening paragraphs of the service page."
        onChange={(event) => set('introduction', event.target.value)}
      />

      <TagInput
        label="What this includes"
        hint="The work itself. Press Enter after each."
        values={draft.includes}
        max={20}
        placeholder="Cabinet removal and disposal"
        error={errors.fields.includes}
        onChange={(values) => set('includes', values)}
      />

      <TagInput
        label="Best for"
        hint="Who this suits."
        values={draft.bestFor}
        max={12}
        placeholder="Kitchens that still have a workable layout"
        error={errors.fields.bestFor}
        onChange={(values) => set('bestFor', values)}
      />

      <TagInput
        label="Worth knowing"
        hint="Honest caveats. Saying what a service is NOT good for earns more trust than another benefit."
        values={draft.considerations}
        max={12}
        placeholder="Moving plumbing adds time and cost"
        error={errors.fields.considerations}
        onChange={(values) => set('considerations', values)}
      />

      <Switch
        label="Show this service on the website"
        description="While it is off, the page is unreachable and the service disappears from the menu, the services list and the estimate form."
        checked={draft.isActive}
        onChange={(checked) => set('isActive', checked)}
      />
      <Switch
        label="Feature it on the homepage"
        checked={draft.isFeatured}
        onChange={(checked) => set('isFeatured', checked)}
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
          hint="Lower numbers come first."
          onChange={(event) => set('displayOrder', Number(event.target.value) || 0)}
        />
        <TextInput
          label="Search-engine title"
          name="metaTitle"
          maxLength={200}
          value={draft.metaTitle}
          error={errors.fields.metaTitle}
          hint="Leave blank to use the name."
          onChange={(event) => set('metaTitle', event.target.value)}
        />
      </div>

      <TextArea
        label="Search-engine description"
        name="metaDescription"
        rows={2}
        maxLength={320}
        showCount
        value={draft.metaDescription}
        error={errors.fields.metaDescription}
        hint="Leave blank to use the summary."
        onChange={(event) => set('metaDescription', event.target.value)}
      />

      {/*
        Photography. Only offered once the service exists — a file has to belong
        to something before it can be uploaded, the same rule the project editor
        follows.
      */}
      {service ? (
        <ImageUploadField
          label="Photograph"
          description="Shown at the top of this service's own page and on its card in the services list. Leave it empty and the page simply renders without one."
          current={
            service.image
              ? {
                  src: service.image.src,
                  width: service.image.width,
                  height: service.image.height,
                  alt: service.image.alt,
                }
              : null
          }
          guidance="A wide photograph of finished work reads best — roughly 3:2, at least 1200 pixels across."
          onUpload={async (file, alt) => {
            const uploaded = await uploadServiceImage(service.id, file, alt);
            toast.success('Photograph updated.');
            onImageChanged();
            return uploaded;
          }}
          onRemove={async () => {
            await deleteServiceImage(service.id);
            toast.success('Photograph removed.');
            onImageChanged();
          }}
          removeTitle="Remove this photograph?"
          removeBody={
            <>
              The picture will be removed from <strong>{service.name}</strong> and its file deleted
              from the server. The service itself is unaffected.
            </>
          }
        />
      ) : null}

      {service && service.linkedProjectCount > 0 ? (
        <Notice tone="info">
          {service.linkedProjectCount === 1
            ? 'One project references this service, so it cannot be deleted.'
            : `${service.linkedProjectCount} projects reference this service, so it cannot be deleted.`}{' '}
          Switch it off instead if you have stopped offering it.
        </Notice>
      ) : null}

      <div className={styles.editorActions}>
        {service ? (
          <button
            type="button"
            className={adminUi.dangerButton}
            disabled={saving || service.linkedProjectCount > 0}
            onClick={() => onDelete(service)}
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
          {saving ? 'Saving…' : service ? 'Save changes' : 'Create service'}
        </PrimaryButton>
      </div>
    </form>
  );
}
