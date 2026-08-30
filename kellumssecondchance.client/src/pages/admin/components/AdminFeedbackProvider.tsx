import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Info, X } from 'lucide-react';
import styles from './AdminFeedbackProvider.module.css';
import { ConfirmDialog } from './Dialog';
import {
  DirtyGuardContext,
  ToastContext,
  type DirtyGuardApi,
  type Toast,
  type ToastApi,
  type ToastTone,
} from './adminFeedback';

const DISMISS_AFTER_MS = 6000;

const ICONS: Record<ToastTone, typeof Check> = {
  success: Check,
  error: AlertTriangle,
  info: Info,
};

/**
 * Save feedback and unsaved-change protection for the whole console.
 *
 * Wraps the admin outlet once, so every screen gets `useToast()` and
 * `useDirtyGuard()` without threading props.
 */
export function AdminFeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const nextId = useRef(1);

  const push = useCallback((tone: ToastTone, message: string) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, tone, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, DISMISS_AFTER_MS);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useMemo<ToastApi>(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      info: (message) => push('info', message),
    }),
    [push],
  );

  /*
   * Browser-level protection for a reload or a closed tab. The message is fixed
   * by every modern browser — only whether the prompt appears at all is under
   * our control.
   */
  useEffect(() => {
    if (!isDirty) return;

    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  /*
   * And for the Back button.
   *
   * `beforeunload` does not fire for an in-app history move, and this
   * application uses BrowserRouter rather than a data router, so react-router's
   * `useBlocker` is unavailable. The standard workaround: while there is
   * unsaved work, keep one throwaway history entry in front of the current
   * page. Back consumes that entry instead of leaving the form, and we ask the
   * question — pushing it straight back if the answer is "stay".
   */
  useEffect(() => {
    if (!isDirty) return;

    window.history.pushState({ kellumsDirtyGuard: true }, '');

    const onPop = () => {
      window.history.pushState({ kellumsDirtyGuard: true }, '');
      setPendingAction(() => () => window.history.go(-2));
    };

    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      // Clean up the sentinel once the form is saved or abandoned, so the Back
      // button does not end up needing two presses afterwards.
      if (window.history.state?.kellumsDirtyGuard) window.history.back();
    };
  }, [isDirty]);

  /*
   * `setIsDirty` comes straight from useState, so it keeps the same identity
   * for the life of the provider. Screens depend on THAT rather than on the
   * guard object, which necessarily changes whenever the dirty state does.
   */
  const guard = useMemo<DirtyGuardApi>(
    () => ({
      isDirty,
      setDirty: setIsDirty,
      confirmDiscard: (action: () => void) => {
        if (!isDirty) {
          action();
          return;
        }
        // Stored in a closure so React does not call it as a state updater.
        setPendingAction(() => action);
      },
    }),
    [isDirty],
  );

  return (
    <ToastContext.Provider value={toast}>
      <DirtyGuardContext.Provider value={guard}>
        {children}

        <ConfirmDialog
          open={pendingAction !== null}
          title="Leave without saving?"
          body={
            <>
              You have changes on this screen that have <strong>not been saved</strong>. Leaving now
              discards them.
            </>
          }
          confirmLabel="Discard changes"
          cancelLabel="Stay here"
          destructive
          onCancel={() => setPendingAction(null)}
          onConfirm={() => {
            const action = pendingAction;
            setPendingAction(null);
            setIsDirty(false);
            action?.();
          }}
        />

        {/*
          Polite, not assertive: a save confirmation should not interrupt what
          a screen reader is already reading. Failures are reported inline as
          well, so nothing important lives only in a toast.
        */}
        <div className={styles.toasts} role="status" aria-live="polite">
          {toasts.map((item) => {
            const Icon = ICONS[item.tone];
            return (
              <div key={item.id} className={`${styles.toast} ${styles[item.tone]}`}>
                <Icon size={16} strokeWidth={2} aria-hidden="true" />
                <p className={styles.toastText}>{item.message}</p>
                <button type="button" className={styles.toastClose} onClick={() => dismiss(item.id)}>
                  <X size={14} aria-hidden="true" />
                  <span className="u-visually-hidden">Dismiss</span>
                </button>
              </div>
            );
          })}
        </div>
      </DirtyGuardContext.Provider>
    </ToastContext.Provider>
  );
}
