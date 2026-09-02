/**
 * ============================================================================
 *  ADMIN API
 * ============================================================================
 *
 *  Every call here hits an endpoint guarded by the AdminOnly policy, and every
 *  mutation additionally carries an antiforgery token. NONE of them fall back to
 *  bundled content: if a save did not reach the server it must be reported as
 *  having failed, never quietly absorbed.
 *
 *  ANTIFORGERY. The token is fetched once and reused. If the server rejects a
 *  request because the token expired (problem `code: "antiforgery"`), the token
 *  is discarded and the request is retried exactly once — a person should not be
 *  shown a failure the client can resolve by itself. Anything beyond one retry
 *  is a real problem and surfaces.
 * ============================================================================
 */

import { ApiError, apiRequest } from './client';
import type {
  AdminEstimateRequest,
  EstimateRequestStatus,
  PagedResult,
  SiteContent,
} from './types';
import type {
  AdminEstimateRequestDetail,
  AdminGalleryImage,
  AdminFaq,
  AdminProject,
  AdminProjectImage,
  AdminProjectListItem,
  AdminService,
  AdminServiceArea,
  AdminSiteSettings,
  AdminTestimonial,
  AttentionItem,
  BeforeAfterPairWrite,
  UploadedImage,
  DashboardMetrics,
  EstimateRequestNote,
  EstimateRequestSort,
  FaqWrite,
  ProjectImageUpdate,
  ProjectWrite,
  ServiceAreaWrite,
  ServiceWrite,
  SiteSettingsWrite,
  TestimonialWrite,
} from './adminTypes';

export function getAdminGallery(signal?: AbortSignal): Promise<readonly AdminGalleryImage[]> {
  return apiRequest<AdminGalleryImage[]>('/api/admin/gallery', { signal });
}

export function uploadGalleryImage(file: File, altText = 'Exterior renovation gallery photograph.', signal?: AbortSignal): Promise<AdminGalleryImage> {
  const form = new FormData(); form.append('file', file); form.append('altText', altText);
  return upload<AdminGalleryImage>('/api/admin/gallery/upload', form, signal);
}

export function updateGalleryImage(id: number, body: { altText: string; caption: string | null; isActive: boolean }): Promise<AdminGalleryImage> {
  return mutate<AdminGalleryImage>(`/api/admin/gallery/${id}`, { method: 'PUT', body });
}

export function reorderGalleryImages(orderedIds: readonly number[]): Promise<void> {
  return mutate<void>('/api/admin/gallery/reorder', { method: 'POST', body: { orderedIds } });
}

export function deleteGalleryImage(id: number): Promise<void> {
  return mutate<void>(`/api/admin/gallery/${id}`, { method: 'DELETE' });
}

/* ------------------------------------------------------------ antiforgery */

let tokenPromise: Promise<string> | null = null;

function fetchToken(): Promise<string> {
  tokenPromise ??= apiRequest<{ token: string }>('/api/admin/auth/antiforgery')
    .then((r) => r.token)
    .catch((error: unknown) => {
      // A failed fetch must not poison every later attempt.
      tokenPromise = null;
      throw error;
    });
  return tokenPromise;
}

/** Discards the cached token. Exported for sign-out and for the login screen. */
export function clearAntiforgeryToken(): void {
  tokenPromise = null;
}

export function antiforgeryToken(): Promise<string> {
  return fetchToken();
}

function isAntiforgeryFailure(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 400 &&
    (error.problem as { code?: string } | null)?.code === 'antiforgery'
  );
}

interface MutateOptions {
  readonly method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly body?: unknown;
  readonly signal?: AbortSignal;
}

/** A state-changing admin call, with one silent retry on a stale token. */
async function mutate<T>(path: string, options: MutateOptions): Promise<T> {
  const send = async (): Promise<T> =>
    apiRequest<T>(path, {
      method: options.method,
      body: options.body,
      antiforgeryToken: await fetchToken(),
      signal: options.signal,
    });

  try {
    return await send();
  } catch (error) {
    if (!isAntiforgeryFailure(error)) throw error;
    clearAntiforgeryToken();
    return send();
  }
}

/**
 * Multipart upload. Deliberately not routed through apiRequest, which sets a
 * JSON content type — the browser has to choose the multipart boundary itself.
 */
async function upload<T>(path: string, form: FormData, signal?: AbortSignal): Promise<T> {
  const send = async (): Promise<T> => {
    const response = await fetch(path, {
      method: 'POST',
      headers: { Accept: 'application/json', 'X-CSRF-TOKEN': await fetchToken() },
      credentials: 'same-origin',
      body: form,
      signal,
    });

    const isJson = response.headers.get('content-type')?.includes('json') ?? false;
    const payload: unknown = isJson ? await response.json().catch(() => null) : null;

    if (!response.ok) {
      const problem = payload as { title?: string; detail?: string } | null;
      throw new ApiError(
        problem?.title || problem?.detail || 'That photo could not be uploaded.',
        response.status,
        payload as never,
      );
    }

    return payload as T;
  };

  try {
    return await send();
  } catch (error) {
    if (!isAntiforgeryFailure(error)) throw error;
    clearAntiforgeryToken();
    return send();
  }
}

/* -------------------------------------------------------------- dashboard */

export interface AdminDashboard {
  readonly metrics: DashboardMetrics;
  readonly recentRequests: readonly AdminEstimateRequest[];
  readonly needsAttention: readonly AttentionItem[];
}

export function getDashboard(signal?: AbortSignal): Promise<AdminDashboard> {
  return apiRequest<AdminDashboard>('/api/admin/dashboard', { signal });
}

/* ------------------------------------------------------ estimate requests */

export interface EstimateRequestQuery {
  readonly status?: EstimateRequestStatus | 'all';
  readonly projectType?: string;
  readonly from?: string;
  readonly to?: string;
  readonly search?: string;
  readonly sort?: EstimateRequestSort;
  readonly page?: number;
  readonly pageSize?: number;
}

export function searchEstimateRequests(
  query: EstimateRequestQuery = {},
  signal?: AbortSignal,
): Promise<PagedResult<AdminEstimateRequest>> {
  const params = new URLSearchParams();
  if (query.status && query.status !== 'all') params.set('status', query.status);
  if (query.projectType) params.set('projectType', query.projectType);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.search) params.set('search', query.search);
  if (query.sort) params.set('sort', query.sort);
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  const qs = params.toString();

  return apiRequest<PagedResult<AdminEstimateRequest>>(
    `/api/admin/estimate-requests${qs ? `?${qs}` : ''}`,
    { signal },
  );
}

export function getEstimateRequestProjectTypes(signal?: AbortSignal): Promise<readonly string[]> {
  return apiRequest<string[]>('/api/admin/estimate-requests/project-types', { signal });
}

export function getEstimateRequest(
  id: number,
  signal?: AbortSignal,
): Promise<AdminEstimateRequestDetail> {
  return apiRequest<AdminEstimateRequestDetail>(`/api/admin/estimate-requests/${id}`, { signal });
}

export function retryEstimateRequestNotification(id: number): Promise<void> {
  return mutate<void>(`/api/admin/estimate-requests/${id}/notification/retry`, { method: 'POST' });
}

export function retryEmploymentInterestNotification(id: number): Promise<void> {
  return mutate<void>(`/api/admin/employment-interests/${id}/notification/retry`, { method: 'POST' });
}

export function changeEstimateRequestStatus(
  id: number,
  status: EstimateRequestStatus,
  rowVersion: string | null,
): Promise<AdminEstimateRequestDetail> {
  return mutate<AdminEstimateRequestDetail>(`/api/admin/estimate-requests/${id}/status`, {
    method: 'PUT',
    body: { status, rowVersion },
  });
}

export function addEstimateRequestNote(id: number, note: string): Promise<EstimateRequestNote> {
  return mutate<EstimateRequestNote>(`/api/admin/estimate-requests/${id}/notes`, {
    method: 'POST',
    body: { note },
  });
}

export function deleteEstimateRequestNote(id: number, noteId: number): Promise<void> {
  return mutate<void>(`/api/admin/estimate-requests/${id}/notes/${noteId}`, { method: 'DELETE' });
}

/* --------------------------------------------------------------- projects */

export function listAdminProjects(signal?: AbortSignal): Promise<readonly AdminProjectListItem[]> {
  return apiRequest<AdminProjectListItem[]>('/api/admin/projects', { signal });
}

export function getAdminProject(id: number, signal?: AbortSignal): Promise<AdminProject> {
  return apiRequest<AdminProject>(`/api/admin/projects/${id}`, { signal });
}

export function createProject(body: ProjectWrite): Promise<AdminProject> {
  return mutate<AdminProject>('/api/admin/projects', { method: 'POST', body });
}

export function updateProject(id: number, body: ProjectWrite): Promise<AdminProject> {
  return mutate<AdminProject>(`/api/admin/projects/${id}`, { method: 'PUT', body });
}

/** Sets the order projects appear in on the public gallery. */
export function reorderProjects(orderedIds: readonly number[]): Promise<void> {
  return mutate<void>('/api/admin/projects/reorder', {
    method: 'POST',
    body: { orderedIds },
  });
}

export function deleteProject(id: number): Promise<void> {
  return mutate<void>(`/api/admin/projects/${id}`, { method: 'DELETE' });
}

/* ---------------------------------------------------------- project media */

export interface ProjectImageUploadInput {
  readonly file: File;
  readonly kind: AdminProjectImage['kind'];
  readonly altText: string;
  readonly caption?: string;
}

export function uploadProjectImage(
  projectId: number,
  input: ProjectImageUploadInput,
  signal?: AbortSignal,
): Promise<AdminProjectImage> {
  const form = new FormData();
  form.append('file', input.file);
  form.append('kind', input.kind);
  form.append('altText', input.altText);
  if (input.caption) form.append('caption', input.caption);

  return upload<AdminProjectImage>(`/api/admin/projects/${projectId}/images`, form, signal);
}

export function updateProjectImage(
  projectId: number,
  imageId: number,
  body: ProjectImageUpdate,
): Promise<AdminProjectImage> {
  return mutate<AdminProjectImage>(`/api/admin/projects/${projectId}/images/${imageId}`, {
    method: 'PUT',
    body,
  });
}

export function deleteProjectImage(projectId: number, imageId: number): Promise<void> {
  return mutate<void>(`/api/admin/projects/${projectId}/images/${imageId}`, { method: 'DELETE' });
}

export function reorderProjectImages(
  projectId: number,
  orderedIds: readonly number[],
): Promise<void> {
  return mutate<void>(`/api/admin/projects/${projectId}/images/reorder`, {
    method: 'POST',
    body: { orderedIds },
  });
}

export function setProjectCoverImage(projectId: number, imageId: number): Promise<void> {
  return mutate<void>(`/api/admin/projects/${projectId}/images/${imageId}/cover`, {
    method: 'POST',
  });
}

export function saveBeforeAfterPair(
  projectId: number,
  body: BeforeAfterPairWrite,
): Promise<readonly AdminProjectImage[]> {
  return mutate<AdminProjectImage[]>(`/api/admin/projects/${projectId}/pairs`, {
    method: 'POST',
    body,
  });
}

/** Sets the order the transformations appear in on the public project page. */
export function reorderBeforeAfterPairs(
  projectId: number,
  orderedPairKeys: readonly string[],
): Promise<void> {
  return mutate<void>(`/api/admin/projects/${projectId}/pairs/reorder`, {
    method: 'POST',
    body: { orderedPairKeys },
  });
}

export function removeBeforeAfterPair(projectId: number, pairKey: string): Promise<void> {
  return mutate<void>(
    `/api/admin/projects/${projectId}/pairs/${encodeURIComponent(pairKey)}`,
    { method: 'DELETE' },
  );
}

/* --------------------------------------------------------------- services */

export function listAdminServices(signal?: AbortSignal): Promise<readonly AdminService[]> {
  return apiRequest<AdminService[]>('/api/admin/services', { signal });
}

export function createService(body: ServiceWrite): Promise<AdminService> {
  return mutate<AdminService>('/api/admin/services', { method: 'POST', body });
}

export function updateService(id: number, body: ServiceWrite): Promise<AdminService> {
  return mutate<AdminService>(`/api/admin/services/${id}`, { method: 'PUT', body });
}

export function deleteService(id: number): Promise<void> {
  return mutate<void>(`/api/admin/services/${id}`, { method: 'DELETE' });
}

/** Replaces the photograph shown on a service page. */
export function uploadServiceImage(
  serviceId: number,
  file: File,
  altText: string,
  signal?: AbortSignal,
): Promise<UploadedImage> {
  const form = new FormData();
  form.append('file', file);
  form.append('altText', altText);
  return upload<UploadedImage>(`/api/admin/services/${serviceId}/image`, form, signal);
}

export function deleteServiceImage(serviceId: number): Promise<void> {
  return mutate<void>(`/api/admin/services/${serviceId}/image`, { method: 'DELETE' });
}

/* ----------------------------------------------------------- testimonials */

export function listAdminTestimonials(signal?: AbortSignal): Promise<readonly AdminTestimonial[]> {
  return apiRequest<AdminTestimonial[]>('/api/admin/testimonials', { signal });
}

export function createTestimonial(body: TestimonialWrite): Promise<AdminTestimonial> {
  return mutate<AdminTestimonial>('/api/admin/testimonials', { method: 'POST', body });
}

export function updateTestimonial(id: number, body: TestimonialWrite): Promise<AdminTestimonial> {
  return mutate<AdminTestimonial>(`/api/admin/testimonials/${id}`, { method: 'PUT', body });
}

export function deleteTestimonial(id: number): Promise<void> {
  return mutate<void>(`/api/admin/testimonials/${id}`, { method: 'DELETE' });
}

/* -------------------------------------------------------------------- faq */

export function listAdminFaqs(signal?: AbortSignal): Promise<readonly AdminFaq[]> {
  return apiRequest<AdminFaq[]>('/api/admin/faqs', { signal });
}

export function createFaq(body: FaqWrite): Promise<AdminFaq> {
  return mutate<AdminFaq>('/api/admin/faqs', { method: 'POST', body });
}

export function updateFaq(id: number, body: FaqWrite): Promise<AdminFaq> {
  return mutate<AdminFaq>(`/api/admin/faqs/${id}`, { method: 'PUT', body });
}

export function deleteFaq(id: number): Promise<void> {
  return mutate<void>(`/api/admin/faqs/${id}`, { method: 'DELETE' });
}

/* ----------------------------------------------------------- service areas */

export function listAdminServiceAreas(signal?: AbortSignal): Promise<readonly AdminServiceArea[]> {
  return apiRequest<AdminServiceArea[]>('/api/admin/service-areas', { signal });
}

export function createServiceArea(body: ServiceAreaWrite): Promise<AdminServiceArea> {
  return mutate<AdminServiceArea>('/api/admin/service-areas', { method: 'POST', body });
}

export function updateServiceArea(id: number, body: ServiceAreaWrite): Promise<AdminServiceArea> {
  return mutate<AdminServiceArea>(`/api/admin/service-areas/${id}`, { method: 'PUT', body });
}

export function deleteServiceArea(id: number): Promise<void> {
  return mutate<void>(`/api/admin/service-areas/${id}`, { method: 'DELETE' });
}

/* ------------------------------------------------------------ site settings */

export function getSiteSettings(signal?: AbortSignal): Promise<AdminSiteSettings> {
  return apiRequest<AdminSiteSettings>('/api/admin/site-settings', { signal });
}

export function saveSiteSettings(body: SiteSettingsWrite): Promise<AdminSiteSettings> {
  return mutate<AdminSiteSettings>('/api/admin/site-settings', { method: 'PUT', body });
}

/**
 * Uploads the card people see when they share a link to the site.
 *
 * Saves the owner putting a file on the server by hand and typing its path;
 * the returned dimensions let the console say whether it will crop well.
 */
export function uploadSocialImage(file: File, signal?: AbortSignal): Promise<UploadedImage> {
  const form = new FormData();
  form.append('file', file);
  return upload<UploadedImage>('/api/admin/site-settings/social-image', form, signal);
}

/**
 * Re-reads the public profile after a settings save, so the header, footer and
 * every other consumer pick up the change without a page reload.
 */
export function refreshPublicSiteContent(signal?: AbortSignal): Promise<SiteContent> {
  return apiRequest<SiteContent>('/api/site-content', { signal });
}
