import type { ProblemDetails } from './types';

/**
 * Thin fetch wrapper over the Kellum's API.
 *
 * Everything is same-origin (`/api/...`): in development Vite proxies to the
 * ASP.NET Core host, in production the same host serves both. That keeps cookies
 * first-party and means there is no API base URL — and therefore no API secret —
 * anywhere in the client bundle.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetails | null;
  /** Field-level validation messages, keyed by camelCase field name. */
  readonly fieldErrors: Record<string, string[]>;

  constructor(message: string, status: number, problem: ProblemDetails | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
    this.fieldErrors = normaliseErrors(problem?.errors);
  }

  get isValidation(): boolean {
    return this.status === 400 || this.status === 422;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  get isUnauthorized(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

/** ASP.NET Core returns PascalCase keys; forms address fields in camelCase. */
function normaliseErrors(errors: Record<string, string[]> | undefined): Record<string, string[]> {
  if (!errors) return {};
  const out: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(errors)) {
    const camel = key.charAt(0).toLowerCase() + key.slice(1);
    out[camel] = messages;
  }
  return out;
}

interface RequestOptions {
  signal?: AbortSignal;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Antiforgery token, required for admin mutations. */
  antiforgeryToken?: string;
}

const DEFAULT_ERROR = 'We could not reach the server. Please check your connection and try again.';

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { signal, method = 'GET', body, antiforgeryToken } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (antiforgeryToken) headers['X-CSRF-TOKEN'] = antiforgeryToken;

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(DEFAULT_ERROR, 0, null);
  }

  if (response.status === 204) return undefined as T;

  const isJson = response.headers.get('content-type')?.includes('json') ?? false;
  const payload: unknown = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const problem = (payload as ProblemDetails | null) ?? null;
    throw new ApiError(problem?.title || problem?.detail || messageForStatus(response.status), response.status, problem);
  }

  return payload as T;
}

function messageForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'Some of those details need another look.';
    case 401:
    case 403:
      return 'You do not have access to that.';
    case 404:
      return 'We could not find what you were looking for.';
    case 429:
      return 'That is a few too many requests in a row. Give it a minute and try again.';
    default:
      return status >= 500 ? 'Something went wrong on our end. Please try again shortly.' : DEFAULT_ERROR;
  }
}
