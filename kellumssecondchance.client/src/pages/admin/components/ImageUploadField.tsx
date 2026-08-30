import type { ReactNode } from 'react';
import { useId, useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import styles from './ImageUploadField.module.css';
import { Notice, PrimaryButton, SecondaryButton } from './AdminUi';
import { ConfirmDialog } from './Dialog';
import { formatBytes } from './adminForm';
import { TextInput } from '@/components/ui/FormField';
import type { UploadedImage } from '@/lib/api/adminTypes';

const ACCEPT = 'image/png,image/jpeg,image/webp';

interface Props {
  label: string;
  /** What this picture is for, in the owner's terms. */
  description: ReactNode;
  /** The image currently in place, if any. */
  current: { readonly src: string; readonly width: number; readonly height: number; readonly alt: string } | null;
  /** Asks for alt text alongside the file. Off for decorative brand artwork. */
  requireAltText?: boolean;
  /** Advisory note shown under the preview, e.g. a recommended size. */
  guidance?: ReactNode;
  /** Returns a warning to show once an image is in place, or null. */
  warn?: (image: { width: number; height: number }) => string | null;
  onUpload: (file: File, altText: string) => Promise<UploadedImage>;
  onRemove?: () => Promise<void>;
  removeTitle?: string;
  removeBody?: ReactNode;
}

/**
 * One picture, uploaded and replaced in place.
 *
 * Used for the photograph on a service page and for the social sharing card —
 * both are a single image rather than a set, so the project photo manager would
 * be far too much machinery.
 *
 * The client checks only the obvious cases. The server re-reads the actual bytes
 * and is the authority: a renamed file passes here and is refused there.
 */
export function ImageUploadField({
  label,
  description,
  current,
  requireAltText = true,
  guidance,
  warn,
  onUpload,
  onRemove,
  removeTitle = 'Remove this image?',
  removeBody,
}: Props) {
  const inputId = useId();
  const fileInput = useRef<HTMLInputElement>(null);

  const [pending, setPending] = useState<File | null>(null);
  const [altText, setAltText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const warning = current && warn ? warn(current) : null;

  const choose = (file: File | null) => {
    setError(null);
    if (!file) {
      setPending(null);
      return;
    }

    if (!ACCEPT.split(',').includes(file.type)) {
      setError(
        'That file type is not supported. Use a JPG, PNG or WebP — the format a phone or camera produces.',
      );
      setPending(null);
      return;
    }

    setPending(file);
    setAltText(current?.alt ?? '');
  };

  const reset = () => {
    setPending(null);
    setAltText('');
    setError(null);
    if (fileInput.current) fileInput.current.value = '';
  };

  const submit = async () => {
    if (!pending) return;
    if (requireAltText && altText.trim().length < 3) {
      setError('Describe the picture so people using a screen reader know what it shows.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await onUpload(pending, altText.trim());
      reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That image was not uploaded.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!onRemove) return;
    setBusy(true);
    try {
      await onRemove();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That image was not removed.');
    } finally {
      setBusy(false);
      setConfirmRemove(false);
    }
  };

  return (
    <div className={styles.field}>
      <p className={styles.label}>{label}</p>
      <p className={styles.description}>{description}</p>

      {current ? (
        <div className={styles.currentRow}>
          <img
            className={styles.preview}
            src={current.src}
            alt={current.alt}
            width={current.width}
            height={current.height}
          />
          <div className={styles.currentMeta}>
            <p className={styles.dimensions}>
              {current.width} × {current.height}
            </p>
            {current.alt ? <p className={styles.altPreview}>{current.alt}</p> : null}
            {onRemove ? (
              <SecondaryButton onClick={() => setConfirmRemove(true)} disabled={busy}>
                <Trash2 size={14} aria-hidden="true" />
                Remove
              </SecondaryButton>
            ) : null}
          </div>
        </div>
      ) : null}

      {warning ? (
        <div className={styles.block}>
          <Notice tone="warn">{warning}</Notice>
        </div>
      ) : null}

      {error ? (
        <div className={styles.block}>
          <Notice tone="danger">{error}</Notice>
        </div>
      ) : null}

      <label className={styles.dropLabel} htmlFor={inputId}>
        <ImagePlus size={18} aria-hidden="true" />
        <span>{current ? 'Choose a replacement' : 'Choose an image'}</span>
      </label>
      <input
        ref={fileInput}
        id={inputId}
        type="file"
        accept={ACCEPT}
        className={styles.fileInput}
        disabled={busy}
        onChange={(event) => choose(event.target.files?.[0] ?? null)}
      />

      {guidance ? <p className={styles.guidance}>{guidance}</p> : null}

      {pending ? (
        <div className={styles.pending}>
          <p className={styles.pendingName}>
            {pending.name} <span className={styles.pendingSize}>({formatBytes(pending.size)})</span>
          </p>

          {requireAltText ? (
            <TextInput
              label="Describe the picture"
              name={`${inputId}-alt`}
              required
              maxLength={300}
              value={altText}
              hint="Read aloud to anyone who cannot see it."
              onChange={(event) => setAltText(event.target.value)}
            />
          ) : null}

          <div className={styles.pendingActions}>
            <SecondaryButton onClick={reset} disabled={busy}>
              Cancel
            </SecondaryButton>
            <PrimaryButton onClick={() => void submit()} disabled={busy}>
              {busy ? 'Uploading…' : 'Upload'}
            </PrimaryButton>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmRemove}
        title={removeTitle}
        body={removeBody ?? <>The picture will be removed and its file deleted from the server.</>}
        confirmLabel="Remove"
        destructive
        busy={busy}
        onCancel={() => setConfirmRemove(false)}
        onConfirm={() => void remove()}
      />
    </div>
  );
}
