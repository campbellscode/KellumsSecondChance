import { useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Link2,
  Link2Off,
  Star,
  Trash2,
} from 'lucide-react';
import styles from './ProjectMediaManager.module.css';
import { GhostButton, Notice, Panel, Pill, PrimaryButton, SecondaryButton } from './AdminUi';
import { ConfirmDialog, Dialog } from './Dialog';
import { useToast } from './adminFeedback';
import { formatBytes } from './adminForm';
import { TextArea, TextInput } from '@/components/ui/FormField';
import {
  deleteProjectImage,
  removeBeforeAfterPair,
  reorderBeforeAfterPairs,
  reorderProjectImages,
  saveBeforeAfterPair,
  setProjectCoverImage,
  updateProjectImage,
  uploadProjectImage,
} from '@/lib/api/admin';
import type { AdminProjectImage } from '@/lib/api/adminTypes';
import type { ProjectImageKind } from '@/lib/api/types';

const ACCEPT = 'image/png,image/jpeg,image/webp';

const KIND_LABEL: Record<ProjectImageKind, string> = {
  Cover: 'Cover',
  Before: 'Before',
  After: 'After',
  Gallery: 'Gallery',
};

interface Props {
  projectId: number;
  images: readonly AdminProjectImage[];
  onChanged: (images: readonly AdminProjectImage[]) => void;
  onReload: () => void;
}

/**
 * The photographs.
 *
 * This is the part of the console a renovation business will use most, so it is
 * built around what they are actually doing: putting a set of pictures in a
 * sensible order, choosing the one that represents the job, and matching a
 * "before" to its "after".
 *
 * Pairing is deliberately NOT a text field. The server generates the key that
 * ties two photographs together; here you pick two pictures from two dropdowns.
 * Nobody should ever have to type "pair-3" to make a slider work.
 */
export function ProjectMediaManager({ projectId, images, onChanged, onReload }: Props) {
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadKind, setUploadKind] = useState<ProjectImageKind>('Gallery');
  const [altText, setAltText] = useState('');
  const [caption, setCaption] = useState('');
  const [editing, setEditing] = useState<AdminProjectImage | null>(null);
  const [deleting, setDeleting] = useState<AdminProjectImage | null>(null);
  const [pairBefore, setPairBefore] = useState('');
  const [pairAfter, setPairAfter] = useState('');
  const [pairError, setPairError] = useState<string | null>(null);

  const ordered = useMemo(
    () => [...images].sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id),
    [images],
  );

  const cover = ordered.find((image) => image.kind === 'Cover') ?? null;

  const pairs = useMemo(() => {
    const map = new Map<string, { before?: AdminProjectImage; after?: AdminProjectImage }>();
    for (const image of ordered) {
      if (!image.pairKey) continue;
      const entry = map.get(image.pairKey) ?? {};
      if (image.kind === 'Before') entry.before = image;
      if (image.kind === 'After') entry.after = image;
      map.set(image.pairKey, entry);
    }
    return [...map.entries()];
  }, [ordered]);

  const unpairedBefore = ordered.filter((i) => i.kind === 'Before' && !i.pairKey);
  const unpairedAfter = ordered.filter((i) => i.kind === 'After' && !i.pairKey);

  /* --------------------------------------------------------------- upload */

  const chooseFile = (file: File | null) => {
    setUploadError(null);
    if (!file) {
      setPendingFile(null);
      return;
    }

    /*
     * A client-side check for the obvious cases only. The server re-reads the
     * actual bytes and is the authority — a renamed .exe would pass here and be
     * rejected there.
     */
    if (!ACCEPT.split(',').includes(file.type)) {
      setUploadError(
        'That file type is not supported. Photographs need to be a JPG, PNG or WebP — the format your phone or camera produces.',
      );
      setPendingFile(null);
      return;
    }

    setPendingFile(file);
    setAltText('');
    setCaption('');
  };

  const upload = async () => {
    if (!pendingFile) return;
    if (altText.trim().length < 3) {
      setUploadError('Describe the photograph so people using a screen reader know what it shows.');
      return;
    }

    setBusy(true);
    setUploadError(null);
    try {
      const image = await uploadProjectImage(projectId, {
        file: pendingFile,
        kind: uploadKind,
        altText: altText.trim(),
        caption: caption.trim() || undefined,
      });
      onChanged([...images, image]);
      setPendingFile(null);
      setAltText('');
      setCaption('');
      if (fileInput.current) fileInput.current.value = '';
      toast.success('Photograph added.');
      onReload();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'That photograph was not uploaded.';
      setUploadError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  /* ---------------------------------------------------------------- edits */

  const saveEdit = async (image: AdminProjectImage, altValue: string, captionValue: string, kind: ProjectImageKind) => {
    setBusy(true);
    try {
      const updated = await updateProjectImage(projectId, image.id, {
        altText: altValue.trim(),
        caption: captionValue.trim() || null,
        kind,
        displayOrder: image.displayOrder,
        pairKey: image.pairKey,
      });
      onChanged(images.map((current) => (current.id === updated.id ? updated : current)));
      setEditing(null);
      toast.success('Photograph updated.');
      onReload();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'That change was not saved.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (image: AdminProjectImage) => {
    setBusy(true);
    try {
      await deleteProjectImage(projectId, image.id);
      onChanged(images.filter((current) => current.id !== image.id));
      toast.success('Photograph removed.');
      onReload();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'That photograph was not removed.');
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  };

  const move = async (image: AdminProjectImage, direction: -1 | 1) => {
    const index = ordered.findIndex((current) => current.id === image.id);
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;

    const next = [...ordered];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved!);

    // Optimistic: the order is redrawn straight away and reconciled on reload.
    onChanged(next.map((current, position) => ({ ...current, displayOrder: position })));

    setBusy(true);
    try {
      await reorderProjectImages(projectId, next.map((current) => current.id));
      onReload();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'The new order was not saved.');
      onReload();
    } finally {
      setBusy(false);
    }
  };

  const makeCover = async (image: AdminProjectImage) => {
    setBusy(true);
    try {
      await setProjectCoverImage(projectId, image.id);
      toast.success('Cover photograph set.');
      onReload();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'The cover was not changed.');
    } finally {
      setBusy(false);
    }
  };

  /* ---------------------------------------------------------------- pairs */

  const createPair = async () => {
    setPairError(null);
    if (!pairBefore || !pairAfter) {
      setPairError('Choose both a before and an after photograph.');
      return;
    }

    setBusy(true);
    try {
      await saveBeforeAfterPair(projectId, {
        beforeImageId: Number(pairBefore),
        afterImageId: Number(pairAfter),
        pairKey: null,
      });
      setPairBefore('');
      setPairAfter('');
      toast.success('Before and after matched.');
      onReload();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'That pair was not saved.';
      setPairError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  /**
   * Moves one transformation up or down the page.
   *
   * The public page takes pair order from the BEFORE photographs, so this is a
   * separate operation from reordering the gallery — reusing the gallery
   * reorder would renumber every picture on the project.
   */
  const movePair = async (pairKey: string, direction: -1 | 1) => {
    const keys = pairs.map(([key]) => key);
    const index = keys.indexOf(pairKey);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= keys.length) return;

    const next = [...keys];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved!);

    setBusy(true);
    try {
      await reorderBeforeAfterPairs(projectId, next);
      onReload();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'The new order was not saved.');
      onReload();
    } finally {
      setBusy(false);
    }
  };

  /**
   * Swaps one half of an existing pair, or empties it.
   *
   * One operation covers "replace the after with a better shot" and "take this
   * one out again": passing the EXISTING pair key updates the pair in place
   * rather than starting a new one, so the transformation keeps its position
   * and the photograph that was swapped out simply becomes loose again.
   */
  const setPairSide = async (
    pairKey: string,
    side: 'Before' | 'After',
    imageId: number | null,
    partner: AdminProjectImage | undefined,
  ) => {
    setBusy(true);
    try {
      const beforeId = side === 'Before' ? imageId : (partner?.id ?? null);
      const afterId = side === 'After' ? imageId : (partner?.id ?? null);

      if (beforeId === null && afterId === null) {
        // Nothing left in it — the pair itself goes, both photographs stay.
        await removeBeforeAfterPair(projectId, pairKey);
      } else {
        await saveBeforeAfterPair(projectId, {
          pairKey,
          beforeImageId: beforeId,
          afterImageId: afterId,
        });
      }

      toast.success(
        imageId === null
          ? 'Photograph taken out of the pair. It is still on the project.'
          : 'Transformation updated.',
      );
      onReload();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'That change was not saved.');
    } finally {
      setBusy(false);
    }
  };

  const unpair = async (pairKey: string) => {
    setBusy(true);
    try {
      await removeBeforeAfterPair(projectId, pairKey);
      toast.success('Pair separated. Both photographs are still here.');
      onReload();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'That pair was not separated.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Panel
        title="Photographs"
        description="Add the pictures, put them in order, choose a cover, and match each before to its after."
      >
        {/* ---- Upload --------------------------------------------------- */}
        <div className={styles.uploader}>
          <label className={styles.dropLabel} htmlFor="project-photo">
            <ImagePlus size={20} aria-hidden="true" />
            <span className={styles.dropText}>
              <span className={styles.dropTitle}>Add a photograph</span>
              <span className={styles.dropHint}>JPG, PNG or WebP · up to 12 MB</span>
            </span>
          </label>
          <input
            ref={fileInput}
            id="project-photo"
            type="file"
            accept={ACCEPT}
            className={styles.fileInput}
            disabled={busy}
            onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
          />
        </div>

        {uploadError ? (
          <div className={styles.uploadError}>
            <Notice tone="danger">{uploadError}</Notice>
          </div>
        ) : null}

        {pendingFile ? (
          <div className={styles.pending}>
            <p className={styles.pendingName}>
              {pendingFile.name} <span className={styles.pendingSize}>({formatBytes(pendingFile.size)})</span>
            </p>

            <div className={styles.pendingFields}>
              <label className={styles.selectField}>
                <span className={styles.selectLabel}>What kind of photograph is this?</span>
                <select
                  className={styles.select}
                  value={uploadKind}
                  onChange={(event) => setUploadKind(event.target.value as ProjectImageKind)}
                >
                  <option value="Gallery">Gallery — one of the finished shots</option>
                  <option value="Before">Before — how the space started</option>
                  <option value="After">After — the matching finished shot</option>
                  <option value="Cover">Cover — the one picture that represents this job</option>
                </select>
              </label>

              <TextInput
                label="Describe the photograph"
                name="altText"
                required
                maxLength={300}
                value={altText}
                hint="Read aloud to anyone who cannot see it, e.g. “Finished kitchen with oak worktops and a navy island”."
                onChange={(event) => setAltText(event.target.value)}
              />

              <TextInput
                label="Caption"
                name="caption"
                maxLength={300}
                value={caption}
                hint="Optional. Shown under the picture on the page."
                onChange={(event) => setCaption(event.target.value)}
              />
            </div>

            <div className={styles.pendingActions}>
              <SecondaryButton
                onClick={() => {
                  setPendingFile(null);
                  setUploadError(null);
                  if (fileInput.current) fileInput.current.value = '';
                }}
                disabled={busy}
              >
                Cancel
              </SecondaryButton>
              <PrimaryButton onClick={() => void upload()} disabled={busy}>
                {busy ? 'Uploading…' : 'Upload'}
              </PrimaryButton>
            </div>
          </div>
        ) : null}

        {/* ---- Gallery -------------------------------------------------- */}
        {ordered.length === 0 ? (
          <p className={styles.empty}>
            No photographs yet. A project with none shows a blank card in the gallery, so this is
            usually the first thing to do after writing the story.
          </p>
        ) : (
          <ul className={styles.grid}>
            {ordered.map((image, index) => (
              <li key={image.id} className={styles.card}>
                <div className={styles.thumbWrap}>
                  <img
                    className={styles.thumb}
                    src={image.src}
                    alt={image.alt}
                    width={image.width}
                    height={image.height}
                    loading="lazy"
                  />
                  <span className={styles.kindBadge}>
                    <Pill tone={image.kind === 'Cover' ? 'warn' : 'info'}>
                      {KIND_LABEL[image.kind]}
                    </Pill>
                  </span>
                </div>

                <div className={styles.cardBody}>
                  <p className={styles.cardAlt}>{image.alt}</p>
                  <p className={styles.cardMeta}>
                    {image.width}×{image.height}
                    {image.isUploaded ? ` · ${formatBytes(image.fileSizeBytes)}` : ' · built in'}
                    {image.pairKey ? ' · paired' : ''}
                  </p>
                </div>

                <div className={styles.cardActions}>
                  <GhostButton
                    onClick={() => void move(image, -1)}
                    disabled={busy || index === 0}
                    title="Move earlier"
                  >
                    <ArrowUp size={14} aria-hidden="true" />
                    <span className="u-visually-hidden">Move {image.alt} earlier</span>
                  </GhostButton>
                  <GhostButton
                    onClick={() => void move(image, 1)}
                    disabled={busy || index === ordered.length - 1}
                    title="Move later"
                  >
                    <ArrowDown size={14} aria-hidden="true" />
                    <span className="u-visually-hidden">Move {image.alt} later</span>
                  </GhostButton>
                  <GhostButton
                    onClick={() => void makeCover(image)}
                    disabled={busy || image.kind === 'Cover'}
                    title="Use as the cover"
                  >
                    <Star size={14} aria-hidden="true" />
                    <span className="u-visually-hidden">Use {image.alt} as the cover</span>
                  </GhostButton>
                  <SecondaryButton onClick={() => setEditing(image)} disabled={busy}>
                    Edit
                  </SecondaryButton>
                  <GhostButton
                    className={styles.deleteAction}
                    onClick={() => setDeleting(image)}
                    disabled={busy}
                    title="Remove"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    <span className="u-visually-hidden">Remove {image.alt}</span>
                  </GhostButton>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!cover && ordered.length > 0 ? (
          <div className={styles.coverWarning}>
            <Notice tone="warn" title="No cover photograph">
              Pick one with the star button. Without it the gallery card for this project is blank.
            </Notice>
          </div>
        ) : null}
      </Panel>

      {/* ---- Pairing ---------------------------------------------------- */}
      <div className={styles.pairPanel}>
        <Panel
          title="Before and after"
          description="Matching a before to an after creates the slider a visitor can drag. Both pictures should be taken from roughly the same spot."
        >
          {pairs.length > 0 ? (
            <ul className={styles.pairList}>
              {pairs.map(([key, pair], index) => (
                <li key={key} className={styles.pair}>
                  <div className={styles.pairHead}>
                    <span className={styles.pairPosition}>
                      Transformation {index + 1} of {pairs.length}
                    </span>
                    <span className={styles.pairOrder}>
                      <GhostButton
                        onClick={() => void movePair(key, -1)}
                        disabled={busy || index === 0}
                        title="Show this transformation earlier"
                      >
                        <ArrowUp size={14} aria-hidden="true" />
                        <span className="u-visually-hidden">
                          Move transformation {index + 1} earlier
                        </span>
                      </GhostButton>
                      <GhostButton
                        onClick={() => void movePair(key, 1)}
                        disabled={busy || index === pairs.length - 1}
                        title="Show this transformation later"
                      >
                        <ArrowDown size={14} aria-hidden="true" />
                        <span className="u-visually-hidden">
                          Move transformation {index + 1} later
                        </span>
                      </GhostButton>
                    </span>
                  </div>

                  <div className={styles.pairSide}>
                    <span className={styles.pairLabel}>Before</span>
                    {pair.before ? (
                      <img
                        className={styles.pairThumb}
                        src={pair.before.src}
                        alt={pair.before.alt}
                        width={pair.before.width}
                        height={pair.before.height}
                        loading="lazy"
                      />
                    ) : (
                      <p className={styles.pairMissing}>Missing — the slider will not show</p>
                    )}
                    <PairSidePicker
                      side="Before"
                      label={`Before photograph for transformation ${index + 1}`}
                      current={pair.before}
                      choices={ordered.filter(
                        (i) => i.kind !== 'Cover' && (!i.pairKey || i.pairKey === key),
                      )}
                      disabled={busy}
                      onChange={(imageId) => void setPairSide(key, 'Before', imageId, pair.after)}
                    />
                  </div>
                  <div className={styles.pairSide}>
                    <span className={styles.pairLabel}>After</span>
                    {pair.after ? (
                      <img
                        className={styles.pairThumb}
                        src={pair.after.src}
                        alt={pair.after.alt}
                        width={pair.after.width}
                        height={pair.after.height}
                        loading="lazy"
                      />
                    ) : (
                      <p className={styles.pairMissing}>Missing — the slider will not show</p>
                    )}
                    <PairSidePicker
                      side="After"
                      label={`After photograph for transformation ${index + 1}`}
                      current={pair.after}
                      choices={ordered.filter(
                        (i) => i.kind !== 'Cover' && (!i.pairKey || i.pairKey === key),
                      )}
                      disabled={busy}
                      onChange={(imageId) => void setPairSide(key, 'After', imageId, pair.before)}
                    />
                  </div>
                  <SecondaryButton
                    className={styles.unpair}
                    onClick={() => void unpair(key)}
                    disabled={busy}
                  >
                    <Link2Off size={14} aria-hidden="true" />
                    Separate
                  </SecondaryButton>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>
              Nothing is matched up yet. Upload one photograph marked “Before” and one marked
              “After”, then pair them below.
            </p>
          )}

          {unpairedBefore.length > 0 || unpairedAfter.length > 0 ? (
            <div className={styles.pairForm}>
              <label className={styles.selectField}>
                <span className={styles.selectLabel}>Before</span>
                <select
                  className={styles.select}
                  value={pairBefore}
                  onChange={(event) => setPairBefore(event.target.value)}
                >
                  <option value="">Choose a photograph…</option>
                  {unpairedBefore.map((image) => (
                    <option key={image.id} value={image.id}>
                      {image.alt}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.selectField}>
                <span className={styles.selectLabel}>After</span>
                <select
                  className={styles.select}
                  value={pairAfter}
                  onChange={(event) => setPairAfter(event.target.value)}
                >
                  <option value="">Choose a photograph…</option>
                  {unpairedAfter.map((image) => (
                    <option key={image.id} value={image.id}>
                      {image.alt}
                    </option>
                  ))}
                </select>
              </label>

              <PrimaryButton
                className={styles.pairButton}
                onClick={() => void createPair()}
                disabled={busy}
              >
                <Link2 size={15} aria-hidden="true" />
                Match these two
              </PrimaryButton>
            </div>
          ) : (
            <p className={styles.pairHint}>
              To make a new pair, upload a photograph marked “Before” and one marked “After”.
            </p>
          )}

          {pairError ? (
            <div className={styles.uploadError}>
              <Notice tone="danger">{pairError}</Notice>
            </div>
          ) : null}
        </Panel>
      </div>

      {/* ---- Edit dialog ------------------------------------------------ */}
      <EditImageDialog
        image={editing}
        busy={busy}
        onCancel={() => setEditing(null)}
        onSave={(alt, cap, kind) => {
          if (editing) void saveEdit(editing, alt, cap, kind);
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Remove this photograph?"
        body={
          <>
            <strong>{deleting?.alt}</strong> will be removed from this project
            {deleting?.isUploaded ? ' and the file deleted from the server' : ''}. This cannot be
            undone.
          </>
        }
        confirmLabel="Remove photograph"
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

interface PairSidePickerProps {
  side: 'Before' | 'After';
  /** Announced name — every pair renders one of these, so it must be unique. */
  label: string;
  current: AdminProjectImage | undefined;
  choices: readonly AdminProjectImage[];
  disabled: boolean;
  onChange: (imageId: number | null) => void;
}

/**
 * Which photograph fills one half of a transformation.
 *
 * A plain select, on purpose: it is the one control that makes "replace the
 * after with the better shot" a single action, and it works with a keyboard and
 * on a phone without any of the machinery a drag-and-drop version would need.
 * "Take it out" is the empty option, so releasing a side is the same gesture.
 */
function PairSidePicker({ side, label, current, choices, disabled, onChange }: PairSidePickerProps) {
  return (
    <label className={styles.sidePicker}>
      <span className="u-visually-hidden">{label}</span>
      <select
        className={styles.sideSelect}
        value={current?.id ?? ''}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))}
      >
        <option value="">— take it out —</option>
        {choices.map((image) => (
          <option key={image.id} value={image.id}>
            {image.alt}
          </option>
        ))}
      </select>
      <span className={styles.sideHint}>Change the {side.toLowerCase()} photograph</span>
    </label>
  );
}

interface EditDialogProps {
  image: AdminProjectImage | null;
  busy: boolean;
  onCancel: () => void;
  onSave: (altText: string, caption: string, kind: ProjectImageKind) => void;
}

function EditImageDialog({ image, busy, onCancel, onSave }: EditDialogProps) {
  /*
   * Keyed on the image id so the fields reset when a different photograph is
   * opened — without the key, React would keep the previous one's text.
   */
  return (
    <Dialog
      open={image !== null}
      onClose={onCancel}
      title="Edit photograph"
      size="md"
      dismissable={!busy}
    >
      {image ? (
        <EditImageForm key={image.id} image={image} busy={busy} onCancel={onCancel} onSave={onSave} />
      ) : null}
    </Dialog>
  );
}

function EditImageForm({
  image,
  busy,
  onCancel,
  onSave,
}: {
  image: AdminProjectImage;
  busy: boolean;
  onCancel: () => void;
  onSave: (altText: string, caption: string, kind: ProjectImageKind) => void;
}) {
  const [alt, setAlt] = useState(image.alt);
  const [caption, setCaption] = useState(image.caption ?? '');
  const [kind, setKind] = useState<ProjectImageKind>(image.kind);

  return (
    <form
      className={styles.editForm}
      onSubmit={(event) => {
        event.preventDefault();
        onSave(alt, caption, kind);
      }}
    >
      <img
        className={styles.editPreview}
        src={image.src}
        alt=""
        width={image.width}
        height={image.height}
      />

      <TextInput
        label="Describe the photograph"
        name="editAlt"
        required
        maxLength={300}
        value={alt}
        hint="What somebody would see. This is read aloud by screen readers."
        onChange={(event) => setAlt(event.target.value)}
      />

      <TextArea
        label="Caption"
        name="editCaption"
        rows={2}
        maxLength={300}
        value={caption}
        hint="Optional, shown under the picture."
        onChange={(event) => setCaption(event.target.value)}
      />

      <label className={styles.selectField}>
        <span className={styles.selectLabel}>Kind</span>
        <select
          className={styles.select}
          value={kind}
          onChange={(event) => setKind(event.target.value as ProjectImageKind)}
        >
          <option value="Gallery">Gallery</option>
          <option value="Before">Before</option>
          <option value="After">After</option>
          <option value="Cover">Cover</option>
        </select>
        {image.pairKey && kind !== image.kind ? (
          <span className={styles.selectWarn}>
            This photograph is part of a before/after pair. Changing its kind will break that pair.
          </span>
        ) : null}
      </label>

      <div className={styles.editActions}>
        <SecondaryButton onClick={onCancel} disabled={busy}>
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={busy || alt.trim().length < 3}>
          {busy ? 'Saving…' : 'Save'}
        </PrimaryButton>
      </div>
    </form>
  );
}
