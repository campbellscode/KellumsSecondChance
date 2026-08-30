import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Trash2 } from 'lucide-react';
import styles from './AdminProjectEditorPage.module.css';
import {
  DangerButton,
  ErrorSummary,
  FormSection,
  Notice,
  PageHeader,
  Panel,
  SaveBar,
  Switch,
  TagInput,
} from './components/AdminUi';
import adminUi from './components/AdminUi.module.css';
import { ProjectMediaManager } from './components/ProjectMediaManager';
import { ConfirmDialog } from './components/Dialog';
import { useDirtyGuard, useToast } from './components/adminFeedback';
import { NO_ERRORS, orNull, sameValue, slugify, toDateInput, toFormErrors } from './components/adminForm';
import type { FormErrors } from './components/adminForm';
import { TextArea, TextInput } from '@/components/ui/FormField';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useAsync } from '@/lib/hooks/useAsync';
import {
  createProject,
  deleteProject,
  getAdminProject,
  listAdminServices,
  updateProject,
} from '@/lib/api/admin';
import { ApiError } from '@/lib/api/client';
import type { AdminProject, AdminProjectImage, ProjectWrite } from '@/lib/api/adminTypes';

/** Everything the form holds, as strings the inputs can bind to directly. */
interface Draft {
  title: string;
  slug: string;
  categoryName: string;
  categorySlug: string;
  location: string;
  summary: string;
  challenge: string;
  vision: string;
  transformation: string;
  outcome: string;
  completedOn: string;
  durationLabel: string;
  propertyType: string;
  highlights: readonly string[];
  serviceIds: readonly number[];
  isFeatured: boolean;
  isActive: boolean;
  displayOrder: number;
  metaTitle: string;
  metaDescription: string;
}

const EMPTY: Draft = {
  title: '',
  slug: '',
  categoryName: '',
  categorySlug: '',
  location: '',
  summary: '',
  challenge: '',
  vision: '',
  transformation: '',
  outcome: '',
  completedOn: '',
  durationLabel: '',
  propertyType: '',
  highlights: [],
  serviceIds: [],
  isFeatured: false,
  isActive: false,
  displayOrder: 0,
  metaTitle: '',
  metaDescription: '',
};

function toDraft(project: AdminProject): Draft {
  return {
    title: project.title,
    slug: project.slug,
    categoryName: project.categoryName,
    categorySlug: project.categorySlug,
    location: project.location ?? '',
    summary: project.summary,
    challenge: project.challenge,
    vision: project.vision,
    transformation: project.transformation,
    outcome: project.outcome ?? '',
    completedOn: toDateInput(project.completedOn),
    durationLabel: project.durationLabel ?? '',
    propertyType: project.propertyType ?? '',
    highlights: project.highlights,
    serviceIds: project.serviceIds,
    isFeatured: project.isFeatured,
    isActive: project.isActive,
    displayOrder: project.displayOrder,
    metaTitle: project.metaTitle ?? '',
    metaDescription: project.metaDescription ?? '',
  };
}

function toPayload(draft: Draft, rowVersion: string | null, sendSlug: boolean): ProjectWrite {
  return {
    title: draft.title.trim(),
    // On update the slug is only sent when it was deliberately changed — a
    // published URL must not move because somebody reworded the heading.
    ...(sendSlug ? { slug: orNull(draft.slug) } : {}),
    categoryName: draft.categoryName.trim(),
    categorySlug: draft.categorySlug.trim() || slugify(draft.categoryName),
    location: orNull(draft.location),
    summary: draft.summary.trim(),
    challenge: draft.challenge.trim(),
    vision: draft.vision.trim(),
    transformation: draft.transformation.trim(),
    outcome: orNull(draft.outcome),
    completedOn: orNull(draft.completedOn),
    durationLabel: orNull(draft.durationLabel),
    propertyType: orNull(draft.propertyType),
    highlights: draft.highlights,
    serviceIds: draft.serviceIds,
    isFeatured: draft.isFeatured,
    isActive: draft.isActive,
    displayOrder: draft.displayOrder,
    metaTitle: orNull(draft.metaTitle),
    metaDescription: orNull(draft.metaDescription),
    rowVersion,
  };
}

/**
 * Create and edit a case study.
 *
 * The story fields (challenge / vision / transformation) are the point of the
 * whole gallery: they are what turns a photograph into evidence that somebody
 * knew what they were doing. The form is ordered the way the page reads.
 *
 * Photographs are managed separately, and only after the project exists — a
 * file has to belong to something before it can be uploaded.
 */
export default function AdminProjectEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const guard = useDirtyGuard();

  const isNew = id === 'new' || id === undefined;
  const numericId = isNew ? 0 : Number(id);

  const loader = useCallback(
    (signal: AbortSignal) => (isNew ? Promise.resolve(null) : getAdminProject(numericId, signal)),
    [isNew, numericId],
  );
  const { data: project, status, error, reload } = useAsync(loader);

  const servicesLoader = useCallback((signal: AbortSignal) => listAdminServices(signal), []);
  const services = useAsync(servicesLoader);

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [baseline, setBaseline] = useState<Draft>(EMPTY);
  const [images, setImages] = useState<readonly AdminProjectImage[]>([]);
  const [rowVersion, setRowVersion] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>(NO_ERRORS);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [categorySlugTouched, setCategorySlugTouched] = useState(false);

  /*
   * Both of these are plain state rather than refs, because they are read and
   * written during render (below) and a ref read at render time is not
   * guaranteed to be current.
   */
  const [adopted, setAdopted] = useState<AdminProject | null>(null);
  const [loadedId, setLoadedId] = useState<number | null>(null);

  /*
   * Adopting the loaded record into the form happens DURING RENDER, not in an
   * effect — React supports adjusting state when an input changes, and doing it
   * here avoids the extra render pass an effect would cause.
   *
   * Two separate guards, because they answer different questions:
   *   - `adopted` tracks the record object, so a reload after a photo change
   *     refreshes the image list and the concurrency token;
   *   - `loadedId` tracks the record ID, so that same reload does NOT overwrite
   *     text the person is part-way through editing.
   */
  if (isNew && loadedId !== 0) {
    setLoadedId(0);
    setAdopted(null);
    setDraft(EMPTY);
    setBaseline(EMPTY);
    setImages([]);
    setRowVersion(null);
  } else if (project && project !== adopted) {
    setAdopted(project);
    setImages(project.images);
    setRowVersion(project.rowVersion);

    if (loadedId !== project.id) {
      setLoadedId(project.id);
      const next = toDraft(project);
      setDraft(next);
      setBaseline(next);
    }
  }

  const dirty = !sameValue(draft, baseline);

  /*
   * Depends on the setter, not on `guard` itself. The guard object is memoised
   * on its own dirty state, so depending on it would re-run this effect every
   * time it reported a change — cleanup clearing the flag and the body setting
   * it again, on every keystroke.
   */
  const { setDirty } = guard;
  useEffect(() => {
    setDirty(dirty);
    return () => setDirty(false);
  }, [dirty, setDirty]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const serviceOptions = useMemo(
    () =>
      (services.data ?? []).map((service) => ({
        id: service.id,
        name: service.name,
        isActive: service.isActive,
      })),
    [services.data],
  );

  const save = async () => {
    setSaving(true);
    setErrors(NO_ERRORS);
    try {
      const payload = toPayload(draft, rowVersion, isNew || slugTouched);
      const saved = isNew ? await createProject(payload) : await updateProject(numericId, payload);

      const next = toDraft(saved);
      setDraft(next);
      setBaseline(next);
      setImages(saved.images);
      setRowVersion(saved.rowVersion);
      setSlugTouched(false);
      setLoadedId(saved.id);
      guard.setDirty(false);

      toast.success(isNew ? 'Project created.' : 'Project saved.');
      if (isNew) navigate(`/admin/projects/${saved.id}`, { replace: true });
    } catch (caught) {
      /*
       * A conflict gets its own wording, and it goes to the BANNER as well as
       * the toast. A toast disappears; the person who just lost a save needs
       * the explanation to still be on screen when they look up.
       */
      const conflict = caught instanceof ApiError && caught.status === 409;
      const formErrors = conflict
        ? {
            summary:
              'Somebody else saved this project while you had it open. '
              + 'Reload the page to see their version — saving now would overwrite it.',
            fields: {},
          }
        : toFormErrors(caught);

      setErrors(formErrors);
      toast.error(formErrors.summary ?? 'Some of those details need another look.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await deleteProject(numericId);
      guard.setDirty(false);
      toast.success('Project deleted.');
      navigate('/admin/projects', { replace: true });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'That project was not deleted.');
      setSaving(false);
      setConfirmDelete(false);
    }
  };

  // `loadedId` is already set when arriving here straight after a create, so
  // the freshly written form is not replaced by a loading placeholder.
  if (!isNew && status === 'loading' && loadedId === null) {
    return <LoadingState label="Loading this project" variant="inline" />;
  }

  if (!isNew && status === 'error') {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <ErrorState
        title={notFound ? 'That project no longer exists' : 'We could not load this project'}
        description={notFound ? 'It may have been deleted.' : (error?.message ?? 'Your website did not answer. Check your connection and try again.')}
        onRetry={notFound ? undefined : reload}
      />
    );
  }

  const previewSlug = slugTouched || !isNew ? draft.slug : slugify(draft.title);

  return (
    <>
      <button
        type="button"
        className={styles.back}
        onClick={() => guard.confirmDiscard(() => navigate('/admin/projects'))}
      >
        <ArrowLeft size={15} aria-hidden="true" />
        <span>All projects</span>
      </button>

      <PageHeader
        eyebrow={isNew ? 'New project' : project?.isSampleContent ? 'Example content' : 'Editing'}
        title={draft.title.trim() || 'Untitled project'}
        lead={
          isNew
            ? 'Write the story first, then add photographs. Nothing appears on the website until you switch it on.'
            : undefined
        }
        actions={
          !isNew && project?.isActive ? (
            <a
              className={adminUi.secondaryButton}
              href={`/projects/${project.slug}`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={14} aria-hidden="true" />
              View on the site
            </a>
          ) : null
        }
      />

      {project?.isSampleContent ? (
        <div className={styles.block}>
          <Notice tone="warn" title="This is one of the built-in examples">
            It is labelled as a demonstration everywhere it appears on the website, and it is kept
            out of search-engine markup. Replace it with a real job when you have one, or switch it
            off below.
          </Notice>
        </div>
      ) : null}

      {errors.summary ? (
        <div className={styles.block}>
          <Notice tone="danger" title="That could not be saved">
            {errors.summary}
          </Notice>
        </div>
      ) : null}

      <div className={styles.block}>
        <ErrorSummary
          fields={errors.fields}
          labels={{
            title: 'Project title',
            slug: 'Web address',
            categoryName: 'Category',
            categorySlug: 'Category address',
            location: 'Where',
            summary: 'Summary',
            challenge: 'What you were up against',
            vision: 'What the plan was',
            transformation: 'What you did',
            outcome: 'How it turned out',
            highlights: 'Highlights',
            serviceIds: 'Services used',
            displayOrder: 'Position in the gallery',
            metaTitle: 'Page title',
            metaDescription: 'Search description',
          }}
        />
      </div>

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <Panel>
          <FormSection
            title="The basics"
            description="What this job was and where it appears in the gallery."
          >
            <TextInput
              label="Project title"
              name="title"
              required
              maxLength={200}
              value={draft.title}
              error={errors.fields.title}
              hint="How it appears as a heading, e.g. “Maple Street kitchen”."
              onChange={(event) => set('title', event.target.value)}
            />

            <div className={styles.two}>
              <TextInput
                label="Category"
                name="categoryName"
                required
                maxLength={120}
                value={draft.categoryName}
                error={errors.fields.categoryName}
                hint="Groups it in the gallery filter, e.g. “Kitchen Remodeling”."
                onChange={(event) => {
                  set('categoryName', event.target.value);
                  /*
                   * The category's own address follows the name until somebody
                   * edits it directly. Comparing against the PREVIOUS name is
                   * what makes that work — comparing against the new one would
                   * stop tracking after the first keystroke.
                   */
                  if (!categorySlugTouched) set('categorySlug', slugify(event.target.value));
                }}
              />
              <TextInput
                label="Where"
                name="location"
                maxLength={120}
                value={draft.location}
                error={errors.fields.location}
                hint="A town or area. Leave blank rather than guessing."
                onChange={(event) => set('location', event.target.value)}
              />
            </div>

            <TextInput
              label="Category address"
              name="categorySlug"
              maxLength={120}
              value={draft.categorySlug}
              error={errors.fields.categorySlug}
              optionalLabel={false}
              hint={
                <>
                  How this category appears in a gallery link. Projects that share a category{' '}
                  <strong>must share this exactly</strong> — &ldquo;kitchen-remodeling&rdquo; and
                  &ldquo;kitchen-remodelling&rdquo; would split one filter into two.
                </>
              }
              onChange={(event) => {
                setCategorySlugTouched(true);
                set('categorySlug', event.target.value);
              }}
            />

            <TextInput
              label="Web address"
              name="slug"
              maxLength={120}
              value={previewSlug}
              error={errors.fields.slug}
              optionalLabel={false}
              hint={
                isNew ? (
                  'Filled in from the title. Change it only if you want a different URL.'
                ) : (
                  <>
                    Changing this <strong>moves the page</strong>: anyone who bookmarked or shared
                    the old address will get a “not found”. Leave it alone unless you have a reason.
                  </>
                )
              }
              onChange={(event) => {
                setSlugTouched(true);
                set('slug', event.target.value);
              }}
            />
            <p className={styles.slugPreview}>/projects/{previewSlug || '…'}</p>

            <TextArea
              label="Summary"
              name="summary"
              required
              rows={3}
              maxLength={600}
              showCount
              value={draft.summary}
              error={errors.fields.summary}
              hint="One or two sentences, shown on the gallery card and in search results."
              onChange={(event) => set('summary', event.target.value)}
            />
          </FormSection>
        </Panel>

        <Panel>
          <FormSection
            title="The story"
            description="These three sections are what the case-study page is built from. Write them the way you would explain the job to somebody standing in the room."
          >
            <TextArea
              label="What you were up against"
              name="challenge"
              required
              rows={4}
              maxLength={2500}
              showCount
              value={draft.challenge}
              error={errors.fields.challenge}
              hint="The state of the space, and the problems that had to be solved."
              onChange={(event) => set('challenge', event.target.value)}
            />
            <TextArea
              label="What the plan was"
              name="vision"
              required
              rows={4}
              maxLength={2500}
              showCount
              value={draft.vision}
              error={errors.fields.vision}
              hint="What the homeowner wanted, and the approach you agreed on."
              onChange={(event) => set('vision', event.target.value)}
            />
            <TextArea
              label="What you did"
              name="transformation"
              required
              rows={5}
              maxLength={2500}
              showCount
              value={draft.transformation}
              error={errors.fields.transformation}
              hint="The work itself. Specifics earn trust — materials, structural changes, the awkward bits."
              onChange={(event) => set('transformation', event.target.value)}
            />
            <TextArea
              label="How it turned out"
              name="outcome"
              rows={3}
              maxLength={2000}
              showCount
              value={draft.outcome}
              error={errors.fields.outcome}
              hint="Optional closing note."
              onChange={(event) => set('outcome', event.target.value)}
            />

            <TagInput
              label="Highlights"
              hint="Short bullet points shown beside the photographs. Press Enter after each."
              values={draft.highlights}
              max={12}
              placeholder="Reclaimed oak worktops"
              error={errors.fields.highlights}
              onChange={(values) => set('highlights', values)}
            />
          </FormSection>
        </Panel>

        <Panel>
          <FormSection title="Details" description="All optional. Anything left blank is simply not shown.">
            <div className={styles.three}>
              <TextInput
                label="Completed"
                name="completedOn"
                type="date"
                value={draft.completedOn}
                error={errors.fields.completedOn}
                onChange={(event) => set('completedOn', event.target.value)}
              />
              <TextInput
                label="How long it took"
                name="durationLabel"
                maxLength={120}
                value={draft.durationLabel}
                error={errors.fields.durationLabel}
                hint="e.g. “Six weeks”."
                onChange={(event) => set('durationLabel', event.target.value)}
              />
              <TextInput
                label="Property type"
                name="propertyType"
                maxLength={120}
                value={draft.propertyType}
                error={errors.fields.propertyType}
                hint="e.g. “1920s bungalow”."
                onChange={(event) => set('propertyType', event.target.value)}
              />
            </div>

            <fieldset className={styles.serviceBox}>
              <legend className={styles.serviceLegend}>Services used on this job</legend>
              <p className={styles.serviceHint}>
                Links the project to your service pages, so a visitor reading about kitchens sees
                this job as an example.
              </p>
              {serviceOptions.length === 0 ? (
                <p className={styles.serviceEmpty}>
                  You have no services set up yet. Add them under Services and they will appear here.
                </p>
              ) : (
                <ul className={styles.serviceList}>
                  {serviceOptions.map((service) => {
                    const checked = draft.serviceIds.includes(service.id);
                    return (
                      <li key={service.id}>
                        <label className={styles.serviceItem}>
                          <input
                            type="checkbox"
                            checked={checked}
                            /*
                             * A switched-off service cannot be newly attached —
                             * it would link the project to a page nobody can
                             * reach — but an existing link stays editable so it
                             * can be removed.
                             */
                            disabled={!service.isActive && !checked}
                            onChange={(event) =>
                              set(
                                'serviceIds',
                                event.target.checked
                                  ? [...draft.serviceIds, service.id]
                                  : draft.serviceIds.filter((value) => value !== service.id),
                              )
                            }
                          />
                          <span>{service.name}</span>
                          {!service.isActive ? (
                            <span className={styles.serviceOff}>switched off</span>
                          ) : null}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
              {errors.fields.serviceIds ? (
                <p className={styles.fieldError}>{errors.fields.serviceIds}</p>
              ) : null}
            </fieldset>
          </FormSection>
        </Panel>

        <Panel>
          <FormSection
            title="Where it shows"
            description="Nothing here changes the words on the page — only where and whether it appears."
          >
            <Switch
              label="Show this project on the website"
              description="While this is off the project is a draft: it has no public page and does not appear in the gallery."
              checked={draft.isActive}
              onChange={(checked) => set('isActive', checked)}
            />
            <Switch
              label="Feature it on the homepage"
              description="Featured projects appear on the homepage and, if they have a matched before/after pair, in the transformation slider."
              checked={draft.isFeatured}
              onChange={(checked) => set('isFeatured', checked)}
            />
            <TextInput
              label="Position in the gallery"
              name="displayOrder"
              type="number"
              min={0}
              max={10000}
              value={String(draft.displayOrder)}
              error={errors.fields.displayOrder}
              hint="Lower numbers come first."
              onChange={(event) => set('displayOrder', Number(event.target.value) || 0)}
            />
          </FormSection>

          <FormSection
            title="Search engines"
            description="Optional. Left blank, the title and summary above are used."
          >
            <TextInput
              label="Page title"
              name="metaTitle"
              maxLength={200}
              value={draft.metaTitle}
              error={errors.fields.metaTitle}
              onChange={(event) => set('metaTitle', event.target.value)}
            />
            <TextArea
              label="Search description"
              name="metaDescription"
              rows={2}
              maxLength={320}
              showCount
              value={draft.metaDescription}
              error={errors.fields.metaDescription}
              onChange={(event) => set('metaDescription', event.target.value)}
            />
          </FormSection>
        </Panel>

        <SaveBar
          dirty={dirty || isNew}
          saving={saving}
          onSave={() => void save()}
          onCancel={
            dirty
              ? () => {
                  setDraft(baseline);
                  setSlugTouched(false);
                }
              : undefined
          }
          saveLabel={isNew ? 'Create project' : 'Save changes'}
          status={
            isNew
              ? 'Create the project, then add photographs.'
              : dirty
                ? 'You have unsaved changes.'
                : 'Everything is saved.'
          }
        />
      </form>

      {/* ---- Photographs -------------------------------------------------- */}
      {isNew ? (
        <div className={styles.block}>
          <Panel title="Photographs">
            <p className={styles.quiet}>
              Photographs can be added once the project exists. Create it first — you can come
              straight back.
            </p>
          </Panel>
        </div>
      ) : (
        <div className={styles.block}>
          <ProjectMediaManager
            projectId={numericId}
            images={images}
            onChanged={(next) => setImages(next)}
            onReload={reload}
          />
        </div>
      )}

      {/* ---- Danger zone -------------------------------------------------- */}
      {!isNew ? (
        <div className={styles.block}>
          <Panel title="Delete this project">
            <p className={styles.quiet}>
              Deleting removes the case study, its page, and every photograph attached to it. There
              is no undo. If you only want it off the website, switch it off above instead — the
              work is then kept but hidden.
            </p>
            <DangerButton
              className={styles.deleteButton}
              onClick={() => setConfirmDelete(true)}
              disabled={saving}
            >
              <Trash2 size={15} aria-hidden="true" />
              Delete project
            </DangerButton>
          </Panel>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this project?"
        body={
          <>
            <strong>{draft.title || 'This project'}</strong> and its {images.length}{' '}
            {images.length === 1 ? 'photograph' : 'photographs'} will be permanently removed. This
            cannot be undone.
          </>
        }
        confirmLabel="Delete permanently"
        destructive
        busy={saving}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void remove()}
      />
    </>
  );
}
