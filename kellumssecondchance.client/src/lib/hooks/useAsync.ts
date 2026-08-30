import { useCallback, useEffect, useState } from 'react';

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  readonly status: AsyncStatus;
  readonly data: T | null;
  readonly error: Error | null;
  readonly isLoading: boolean;
  readonly reload: () => void;
}

interface Snapshot<T> {
  /** The loader that produced this result — used to detect a stale snapshot. */
  readonly loader: unknown;
  readonly nonce: number;
  readonly status: AsyncStatus;
  readonly data: T | null;
  readonly error: Error | null;
}

/**
 * Runs an async loader and exposes explicit loading / success / error states.
 *
 * The loader must be a stable reference (wrap it in `useCallback` with its own
 * dependencies); changing that reference re-runs the load. The in-flight request
 * is aborted when the loader changes or the component unmounts.
 *
 * Loading is *derived* rather than assigned: a snapshot produced by a previous
 * loader is simply treated as stale. That avoids a synchronous setState inside
 * the effect and the extra render pass it would cause.
 */
export function useAsync<T>(loader: (signal: AbortSignal) => Promise<T>): AsyncState<T> {
  const [nonce, setNonce] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot<T>>({
    loader,
    nonce: 0,
    status: 'loading',
    data: null,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    loader(controller.signal)
      .then((data) => {
        if (!active) return;
        setSnapshot({ loader, nonce, status: 'success', data, error: null });
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setSnapshot({
          loader,
          nonce,
          status: 'error',
          data: null,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [loader, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const isFresh = snapshot.loader === loader && snapshot.nonce === nonce;
  const status: AsyncStatus = isFresh ? snapshot.status : 'loading';

  return {
    status,
    // Keep the previous data visible while a refresh is in flight so the layout
    // does not collapse; a failed load clears it.
    data: status === 'error' ? null : snapshot.data,
    error: isFresh ? snapshot.error : null,
    isLoading: status === 'loading',
    reload,
  };
}
