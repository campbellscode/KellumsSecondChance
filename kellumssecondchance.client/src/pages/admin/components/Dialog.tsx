/**
 * Modal dialogs for the console.
 *
 * Built on the native <dialog> element with showModal(), which gives focus
 * trapping, the top layer, inert background content and Escape-to-close from
 * the platform rather than from three hundred lines of hand-written focus
 * management that would still get an edge case wrong.
 */

import type { ReactNode } from 'react';
import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import styles from './Dialog.module.css';
import { DangerButton, PrimaryButton, SecondaryButton } from './AdminUi';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** Widens the panel for editors; the default suits a confirmation. */
  size?: 'sm' | 'md' | 'lg';
  /** Blocks Escape and the backdrop, for a destructive step mid-flight. */
  dismissable?: boolean;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'sm',
  dismissable = true,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  /*
   * A screen usually has more than one dialog mounted at once — an editor and
   * its delete confirmation, for instance. A fixed id would put duplicates in
   * the document and leave aria-labelledby pointing at whichever came first.
   */
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    // `cancel` fires for Escape. Closing has to go through the parent so React
    // state and the DOM cannot disagree about whether the dialog is open.
    const onCancel = (event: Event) => {
      event.preventDefault();
      if (dismissable) onClose();
    };

    dialog.addEventListener('cancel', onCancel);
    return () => dialog.removeEventListener('cancel', onCancel);
  }, [onClose, dismissable]);

  return (
    <dialog ref={ref} className={`${styles.dialog} ${styles[size]}`} aria-labelledby={titleId}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title} id={titleId}>
            {title}
          </h2>
          {description ? <p className={styles.description}>{description}</p> : null}
        </div>
        {dismissable ? (
          <button type="button" className={styles.close} onClick={onClose}>
            <X size={17} aria-hidden="true" />
            <span className="u-visually-hidden">Close</span>
          </button>
        ) : null}
      </div>

      {children ? <div className={styles.body}>{children}</div> : null}
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </dialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Say what will actually happen, in plain words. */
  body: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * "Are you sure?" — but specific.
 *
 * `body` should name the record and state the consequence ("This removes the
 * Maple Street Kitchen case study and its four photographs"), because a generic
 * confirmation trains people to click through without reading.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      dismissable={!busy}
      footer={
        <>
          <SecondaryButton onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </SecondaryButton>
          {destructive ? (
            <DangerButton onClick={onConfirm} disabled={busy}>
              {busy ? 'Working…' : confirmLabel}
            </DangerButton>
          ) : (
            <PrimaryButton onClick={onConfirm} disabled={busy}>
              {busy ? 'Working…' : confirmLabel}
            </PrimaryButton>
          )}
        </>
      }
    >
      <div className={styles.confirmBody}>{body}</div>
    </Dialog>
  );
}
