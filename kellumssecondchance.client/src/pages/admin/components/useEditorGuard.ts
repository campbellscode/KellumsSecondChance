import { useEffect } from 'react';
import { useDirtyGuard } from './adminFeedback';

/**
 * Unsaved-change protection for a record editor shown in a dialog.
 *
 * The dialogs are where most content is actually written — a service page runs
 * to several paragraphs — and closing one used to discard everything without a
 * word. This reports the form's dirty state to the shell (so navigating away or
 * reloading is caught too) and returns a close handler that asks first.
 *
 * @param dirty   whether the form differs from what was loaded
 * @param onClose what to do once leaving is agreed
 */
export function useEditorGuard(dirty: boolean, onClose: () => void) {
  const guard = useDirtyGuard();
  const { setDirty, confirmDiscard } = guard;

  useEffect(() => {
    setDirty(dirty);
    // Clearing on unmount matters: the dialog closing must not leave the shell
    // believing there is still unsaved work somewhere.
    return () => setDirty(false);
  }, [dirty, setDirty]);

  /*
   * Only the close handler. Escape and the backdrop belong to the Dialog, which
   * the PARENT owns — the parent routes its own onClose through the same shell
   * guard this hook reports into, so every exit asks the same question without
   * a prop being threaded down.
   */
  return { requestClose: () => confirmDiscard(onClose) };
}
