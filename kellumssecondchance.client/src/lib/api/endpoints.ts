import { ApiError, apiRequest } from './client';
import type {
  AdminUser,
  EstimateRequestPayload,
  EstimateRequestResult,
  FaqItem,
  ProjectDetail,
  ProjectSummary,
  ServiceArea,
  ServiceDetail,
  ServiceSummary,
  SiteContent,
  Testimonial,
} from './types';

/**
 * ============================================================================
 *  CONTENT FALLBACK
 * ============================================================================
 *
 *  The site is designed to be run before the database exists. When
 *  `VITE_CONTENT_FALLBACK` is on, a failed *read* falls back to the bundled
 *  sample content — the same records the server seeds — so the marketing site
 *  renders completely against no backend at all.
 *
 *  Defaults: ON in development, OFF in production builds. In production a
 *  failed read surfaces the designed error state instead of quietly pretending.
 *
 *  The sample content is imported dynamically, so it is a separate chunk that
 *  is only downloaded if a request actually fails — it never costs a visitor
 *  who has a working API.
 *
 *  Writes (the estimate form, admin mutations) NEVER fall back. A submission
 *  that did not reach the server must report honestly that it did not.
 * ============================================================================
 */
const FALLBACK_ENABLED = (() => {
  const flag = import.meta.env.VITE_CONTENT_FALLBACK;
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return import.meta.env.DEV;
})();

type SampleContent = typeof import('@/content/sampleContent');

function loadSampleContent(): Promise<SampleContent> {
  return import('@/content/sampleContent');
}

/** Runs a read, falling back to bundled sample content when permitted. */
async function read<T>(
  request: () => Promise<T>,
  fallback: (sample: SampleContent) => T,
): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    // A 404 is a real answer ("no such project"), never a reason to fall back.
    if (error instanceof ApiError && error.status === 404) throw error;
    if (!FALLBACK_ENABLED) throw error;
    return fallback(await loadSampleContent());
  }
}

function notFound(what: string): never {
  throw new ApiError(`We could not find that ${what}.`, 404, null);
}

/* --------------------------------------------------------------- services */

export function getServices(signal?: AbortSignal): Promise<readonly ServiceSummary[]> {
  return read(
    () => apiRequest<ServiceSummary[]>('/api/services', { signal }),
    (sample) => sample.sampleServiceSummaries,
  );
}

export function getService(slug: string, signal?: AbortSignal): Promise<ServiceDetail> {
  return read(
    () => apiRequest<ServiceDetail>(`/api/services/${encodeURIComponent(slug)}`, { signal }),
    (sample) => sample.sampleServices.find((s) => s.slug === slug) ?? notFound('service'),
  );
}

/* --------------------------------------------------------------- projects */

export interface ProjectQuery {
  readonly category?: string;
  readonly featuredOnly?: boolean;
  readonly search?: string;
  readonly take?: number;
}

function applyProjectQuery(
  items: readonly ProjectSummary[],
  query: ProjectQuery,
): readonly ProjectSummary[] {
  let result = items;
  if (query.category && query.category !== 'all') {
    result = result.filter((p) => p.categorySlug === query.category);
  }
  if (query.featuredOnly) result = result.filter((p) => p.isFeatured);
  if (query.search) {
    const needle = query.search.trim().toLowerCase();
    result = result.filter(
      (p) =>
        p.title.toLowerCase().includes(needle) ||
        p.summary.toLowerCase().includes(needle) ||
        p.category.toLowerCase().includes(needle) ||
        (p.location?.toLowerCase().includes(needle) ?? false),
    );
  }
  return query.take ? result.slice(0, query.take) : result;
}

export function getProjects(
  query: ProjectQuery = {},
  signal?: AbortSignal,
): Promise<readonly ProjectSummary[]> {
  const params = new URLSearchParams();
  if (query.category && query.category !== 'all') params.set('category', query.category);
  if (query.featuredOnly) params.set('featuredOnly', 'true');
  if (query.search) params.set('search', query.search);
  if (query.take) params.set('take', String(query.take));
  const qs = params.toString();

  return read(
    () => apiRequest<ProjectSummary[]>(`/api/projects${qs ? `?${qs}` : ''}`, { signal }),
    (sample) => applyProjectQuery(sample.sampleProjectSummaries, query),
  );
}

export function getProject(slug: string, signal?: AbortSignal): Promise<ProjectDetail> {
  return read(
    () => apiRequest<ProjectDetail>(`/api/projects/${encodeURIComponent(slug)}`, { signal }),
    (sample) => sample.sampleProjects.find((p) => p.slug === slug) ?? notFound('project'),
  );
}

/**
 * Featured projects with their full image sets, for the homepage comparison
 * feature. A dedicated endpoint keeps the homepage from over-fetching every
 * project just to find the ones that have a before/after pair.
 */
export function getTransformations(
  take = 4,
  signal?: AbortSignal,
): Promise<readonly ProjectDetail[]> {
  return read(
    () => apiRequest<ProjectDetail[]>(`/api/projects/transformations?take=${take}`, { signal }),
    (sample) =>
      sample.sampleProjects
        .filter((p) => p.isFeatured && p.images.some((i) => i.kind === 'Before'))
        .slice(0, take),
  );
}

export interface ProjectCategory {
  readonly slug: string;
  readonly name: string;
  readonly count: number;
}

export function getProjectCategories(signal?: AbortSignal): Promise<readonly ProjectCategory[]> {
  return read(
    () => apiRequest<ProjectCategory[]>('/api/projects/categories', { signal }),
    (sample) => {
      const counts = new Map<string, ProjectCategory>();
      for (const project of sample.sampleProjectSummaries) {
        const existing = counts.get(project.categorySlug);
        counts.set(project.categorySlug, {
          slug: project.categorySlug,
          name: project.category,
          count: (existing?.count ?? 0) + 1,
        });
      }
      return [...counts.values()];
    },
  );
}

/* ----------------------------------------------------------- testimonials */

export function getTestimonials(
  options: { featuredOnly?: boolean } = {},
  signal?: AbortSignal,
): Promise<readonly Testimonial[]> {
  const qs = options.featuredOnly ? '?featuredOnly=true' : '';
  return read(
    () => apiRequest<Testimonial[]>(`/api/testimonials${qs}`, { signal }),
    (sample) =>
      options.featuredOnly
        ? sample.sampleTestimonials.filter((t) => t.isFeatured)
        : sample.sampleTestimonials,
  );
}

/* -------------------------------------------------------------------- faq */

export function getFaqs(signal?: AbortSignal): Promise<readonly FaqItem[]> {
  return read(
    () => apiRequest<FaqItem[]>('/api/faqs', { signal }),
    // The offline fallback must apply the same review gate the server does, or
    // an unanswered question would slip out whenever the API is unreachable.
    (sample) => sample.sampleFaqs.filter((f) => !f.needsReview),
  );
}

/* ----------------------------------------------------------- service area */

export function getServiceAreas(signal?: AbortSignal): Promise<readonly ServiceArea[]> {
  return read(
    () => apiRequest<ServiceArea[]>('/api/service-areas', { signal }),
    (sample) => sample.sampleServiceAreas,
  );
}

/* ---------------------------------------------------------- site content */

export function getSiteContent(signal?: AbortSignal): Promise<SiteContent> {
  return read(
    () => apiRequest<SiteContent>('/api/site-content', { signal }),
    (sample) => sample.sampleSiteContent,
  );
}

/* ------------------------------------------------------ estimate requests */

/** Never falls back — a failed submission must be reported as failed. */
export function submitEstimateRequest(
  payload: EstimateRequestPayload,
  signal?: AbortSignal,
): Promise<EstimateRequestResult> {
  return apiRequest<EstimateRequestResult>('/api/estimate-requests', {
    method: 'POST',
    body: payload,
    signal,
  });
}

/* ------------------------------------------------------------------ admin */

export function getAntiforgeryToken(signal?: AbortSignal): Promise<{ token: string }> {
  return apiRequest<{ token: string }>('/api/admin/auth/antiforgery', { signal });
}

export function adminLogin(
  credentials: { email: string; password: string },
  antiforgeryToken: string,
  signal?: AbortSignal,
): Promise<AdminUser> {
  return apiRequest<AdminUser>('/api/admin/auth/login', {
    method: 'POST',
    body: credentials,
    antiforgeryToken,
    signal,
  });
}

export function adminLogout(antiforgeryToken: string): Promise<void> {
  return apiRequest<void>('/api/admin/auth/logout', { method: 'POST', antiforgeryToken });
}

export function adminMe(signal?: AbortSignal): Promise<AdminUser> {
  return apiRequest<AdminUser>('/api/admin/auth/me', { signal });
}
