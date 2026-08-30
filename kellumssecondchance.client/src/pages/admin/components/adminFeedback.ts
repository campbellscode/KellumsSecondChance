import { createContext, useContext } from 'react';

/**
 * Save feedback and unsaved-change tracking, shared by every console screen.
 *
 * The context lives in its own module (no components) so the provider file can
 * still be hot-reloaded by Fast Refresh.
 */

export type ToastTone = 'success' | 'error' | 'info';

export interface Toast {
  readonly id: number;
  readonly tone: ToastTone;
  readonly message: string;
}

export interface ToastApi {
  /** Confirms a save. Short, past tense, names what changed. */
  success: (message: string) => void;
  /** Reports a failure. Always says the change was NOT saved. */
  error: (message: string) => void;
  info: (message: string) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

const NO_TOASTS: ToastApi = {
  success: () => {},
  error: () => {},
  info: () => {},
};

export function useToast(): ToastApi {
  return useContext(ToastContext) ?? NO_TOASTS;
}

/**
 * Unsaved-change tracking.
 *
 * The app uses BrowserRouter rather than a data router, so react-router's
 * `useBlocker` is unavailable. Instead a screen reports its dirty state here,
 * the shell warns before a browser-level unload, and the console's own
 * navigation asks first. Both halves matter: `beforeunload` alone would let
 * someone lose an hour of typing by clicking "Projects" in the sidebar.
 */
export interface DirtyGuardApi {
  readonly isDirty: boolean;
  /** Called by a form whenever its dirty state changes. */
  setDirty: (dirty: boolean) => void;
  /**
   * Runs `action` immediately when nothing is unsaved; otherwise asks first and
   * runs it only if the person confirms.
   */
  confirmDiscard: (action: () => void) => void;
}

export const DirtyGuardContext = createContext<DirtyGuardApi | null>(null);

const NO_GUARD: DirtyGuardApi = {
  isDirty: false,
  setDirty: () => {},
  confirmDiscard: (action) => action(),
};

export function useDirtyGuard(): DirtyGuardApi {
  return useContext(DirtyGuardContext) ?? NO_GUARD;
}
