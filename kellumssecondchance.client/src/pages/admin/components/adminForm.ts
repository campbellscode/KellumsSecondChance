import { ApiError } from '@/lib/api/client';

/**
 * Turning a server rejection into something a person can act on.
 *
 * ASP.NET Core returns RFC 9457 problem documents whose `errors` map is keyed by
 * the DTO property name. The client normalises those keys to camelCase, which
 * matches the field names used in these forms, so a validation failure lands
 * under the input that caused it instead of as one anonymous banner.
 */

export interface FormErrors {
  /** Message shown above the form when the failure is not field-specific. */
  readonly summary: string | null;
  readonly fields: Readonly<Record<string, string>>;
}

export const NO_ERRORS: FormErrors = { summary: null, fields: {} };

export function toFormErrors(error: unknown): FormErrors {
  if (!(error instanceof ApiError)) {
    return {
      summary: error instanceof Error ? error.message : 'That could not be saved.',
      fields: {},
    };
  }

  const fields: Record<string, string> = {};
  for (const [key, messages] of Object.entries(error.fieldErrors)) {
    // An empty key is the model-level error bucket, not a field.
    if (key && messages.length > 0) fields[key] = messages[0]!;
  }

  const modelLevel = error.fieldErrors['']?.[0];
  const hasFieldErrors = Object.keys(fields).length > 0;

  return {
    summary: modelLevel ?? (hasFieldErrors ? null : error.message),
    fields,
  };
}

/** A 409 means somebody else saved first — never a validation problem. */
export function isConflict(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}

/* ------------------------------------------------------------------ slugs */

/**
 * Mirrors the server's Slugify so the URL preview shown while typing matches
 * what will actually be stored. The server remains authoritative; this only
 * removes the surprise.
 */
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    // The server truncates at the same point, so the preview never shows a
    // slug that would come back trimmed.
    .slice(0, 110)
    .replace(/-+$/, '');
}

/* ----------------------------------------------------------------- values */

/** Trims, and treats an all-whitespace field as "not supplied". */
export function orNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length === 0 ? null : trimmed;
}

/** Deep-ish equality for the small plain objects these forms hold. */
export function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/* ------------------------------------------------------------------ dates */

/** ISO date (yyyy-MM-dd) for <input type="date">, or '' when unset. */
export function toDateInput(value: string | null): string {
  if (!value) return '';
  // The API sends DateOnly as yyyy-MM-dd already; guard anything else.
  return value.length >= 10 ? value.slice(0, 10) : '';
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** "3 days ago" — for a lead list, where age is the thing that matters. */
export function relativeAge(value: string): string {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';

  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;

  const days = Math.round(hours / 24);
  if (days < 30) return days === 1 ? 'yesterday' : `${days} days ago`;

  const months = Math.round(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
