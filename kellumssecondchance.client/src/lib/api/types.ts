/**
 * Shared API contract types.
 *
 * These mirror the DTOs returned by KellumsSecondChance.Server. Keep them in sync
 * with `Dtos/*.cs` — the server is the source of truth for shape and nullability.
 */

/* ----------------------------------------------------------------- media */

export interface ImageAsset {
  /** Path relative to the site root, e.g. "/media/projects/x/cover.svg". */
  readonly src: string;
  readonly width: number;
  readonly height: number;
  /** Meaningful alternative text. Empty string marks a purely decorative image. */
  readonly alt: string;
  /** Optional modern-format sources, largest preference first. */
  readonly sources?: readonly { readonly type: string; readonly srcSet: string }[];
}

/* --------------------------------------------------------------- services */

export interface ServiceSummary {
  readonly id: number;
  readonly slug: string;
  readonly name: string;
  /** Short line used on cards and in navigation. */
  readonly tagline: string;
  readonly summary: string;
  /** Lucide icon key — see components/ui/ServiceIcon.tsx for the mapping. */
  readonly icon: string;
  readonly image: ImageAsset | null;
  readonly displayOrder: number;
  readonly isFeatured: boolean;
}

export interface ServiceDetail extends ServiceSummary {
  readonly headline: string;
  readonly introduction: string;
  /** What the crew actually does. Rendered as a checked list. */
  readonly includes: readonly string[];
  /** Honest framing of what this service is good for. */
  readonly bestFor: readonly string[];
  readonly considerations: readonly string[];
  readonly relatedProjectSlugs: readonly string[];
  readonly metaTitle: string | null;
  readonly metaDescription: string | null;
}

/* --------------------------------------------------------------- projects */

export type ProjectImageKind = 'Cover' | 'Before' | 'After' | 'Gallery';

export interface ProjectImage extends ImageAsset {
  readonly id: number;
  readonly kind: ProjectImageKind;
  readonly caption: string | null;
  readonly displayOrder: number;
  /** Pairs a Before with its matching After for comparison sliders. */
  readonly pairKey: string | null;
}

export interface ProjectSummary {
  readonly id: number;
  readonly slug: string;
  readonly title: string;
  readonly category: string;
  readonly categorySlug: string;
  readonly location: string | null;
  readonly summary: string;
  readonly completedOn: string | null;
  readonly coverImage: ImageAsset | null;
  readonly isFeatured: boolean;
  readonly displayOrder: number;
  readonly hasBeforeAfter: boolean;
  /** TRUE for seeded demonstration case studies. The UI labels these. */
  readonly isSampleContent: boolean;
}

export interface ProjectDetail extends ProjectSummary {
  readonly challenge: string;
  readonly vision: string;
  readonly transformation: string;
  readonly outcome: string | null;
  readonly durationLabel: string | null;
  readonly propertyType: string | null;
  readonly serviceSlugs: readonly string[];
  readonly serviceNames: readonly string[];
  readonly highlights: readonly string[];
  readonly images: readonly ProjectImage[];
  readonly metaTitle: string | null;
  readonly metaDescription: string | null;
}

export interface BeforeAfterPair {
  readonly key: string;
  readonly label: string;
  readonly before: ProjectImage;
  readonly after: ProjectImage;
}

/* ----------------------------------------------------------- testimonials */

export interface Testimonial {
  readonly id: number;
  readonly firstName: string;
  readonly lastInitial: string | null;
  readonly location: string | null;
  readonly rating: number;
  readonly quote: string;
  readonly projectCategory: string | null;
  readonly reviewedOn: string | null;
  readonly isFeatured: boolean;
  /**
   * TRUE for seeded demo copy. The UI must visibly label these so a placeholder
   * review is never presented as a real customer statement.
   */
  readonly isSampleContent: boolean;
  readonly source: 'Direct' | 'Google' | 'Facebook' | 'Other';
}

/* -------------------------------------------------------------------- faq */

export interface FaqItem {
  readonly id: number;
  readonly question: string;
  readonly answer: string;
  readonly category: string;
  readonly categorySlug: string;
  readonly displayOrder: number;
  /**
   * TRUE while the answer depends on a business policy nobody has set yet. The
   * public API never returns these; the admin console does.
   */
  readonly needsReview: boolean;
  /** Staff-only note. Null on every public response. */
  readonly reviewNote: string | null;
}

/* ----------------------------------------------------------- service area */

export type ServiceAreaKind = 'City' | 'County' | 'PostalCode' | 'Region';

export interface ServiceArea {
  readonly id: number;
  readonly name: string;
  readonly kind: ServiceAreaKind;
  readonly stateOrRegion: string | null;
  readonly postalCodes: readonly string[];
  readonly isPrimary: boolean;
  readonly note: string | null;
  readonly displayOrder: number;
  /** TRUE while the area list is placeholder data awaiting confirmation. */
  readonly isSampleContent: boolean;
}

/* -------------------------------------------------------- site settings */

export interface SiteContent {
  readonly businessName: string;
  readonly tagline: string;
  readonly phoneDisplay: string | null;
  readonly phoneE164: string | null;
  readonly email: string | null;
  readonly serviceAreaSummary: string | null;
  readonly licensing: string | null;
  readonly insurance: string | null;
  readonly foundedYear: number | null;
  readonly addressLocality: string | null;
  readonly addressRegion: string | null;
  readonly socialLinks: readonly { readonly label: string; readonly href: string; readonly icon: string }[];
}

/* ------------------------------------------------------ estimate requests */

export type BudgetRange =
  | 'NotSure'
  | 'Under5k'
  | 'From5kTo15k'
  | 'From15kTo35k'
  | 'From35kTo75k'
  | 'Over75k';

export type ProjectTimeline =
  | 'NotSure'
  | 'Immediately'
  | 'WithinOneMonth'
  | 'OneToThreeMonths'
  | 'ThreeToSixMonths'
  | 'JustPlanning';

export type PropertyType = 'SingleFamily' | 'Townhouse' | 'Condo' | 'MultiFamily' | 'Rental' | 'Other';

export type PreferredContactMethod = 'Phone' | 'Email' | 'Text' | 'NoPreference';

export interface EstimateRequestPayload {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone: string | null;
  readonly projectTypeSlugs: readonly string[];
  readonly propertyType: PropertyType;
  readonly addressLine: string | null;
  readonly city: string | null;
  readonly postalCode: string;
  readonly timeline: ProjectTimeline;
  readonly budgetRange: BudgetRange;
  readonly description: string;
  readonly preferredContactMethod: PreferredContactMethod;
  readonly referralSource: string | null;
  /** Honeypot. Must stay empty; a value means a bot filled the hidden field. */
  readonly companyWebsite: string | null;
  /** Milliseconds the visitor spent on the form. Sub-second fills are rejected. */
  readonly elapsedMs: number;
}

export interface EstimateRequestResult {
  readonly reference: string;
  readonly submittedAtUtc: string;
  readonly message: string;
}

/* --------------------------------------------------------------- errors */

/** RFC 9457 problem details, as produced by ASP.NET Core. */
export interface ProblemDetails {
  readonly type?: string;
  readonly title?: string;
  readonly status?: number;
  readonly detail?: string;
  readonly instance?: string;
  readonly errors?: Record<string, string[]>;
  readonly traceId?: string;
}

/* ----------------------------------------------------------- admin types */

export type EstimateRequestStatus =
  | 'New'
  | 'Contacted'
  | 'EstimateScheduled'
  | 'EstimateSent'
  | 'Won'
  | 'Lost'
  | 'Archived';

export interface AdminEstimateRequest {
  readonly id: number;
  readonly reference: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone: string | null;
  readonly projectTypes: readonly string[];
  readonly propertyType: PropertyType;
  readonly addressLine: string | null;
  readonly city: string | null;
  readonly postalCode: string;
  readonly timeline: ProjectTimeline;
  readonly budgetRange: BudgetRange;
  readonly description: string;
  readonly preferredContactMethod: PreferredContactMethod;
  readonly referralSource: string | null;
  readonly status: EstimateRequestStatus;
  readonly internalNotes: string | null;
  readonly createdAtUtc: string;
  readonly updatedAtUtc: string | null;
}

export interface PagedResult<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
  readonly totalPages: number;
}

export interface AdminUser {
  readonly email: string;
  readonly displayName: string;
  readonly roles: readonly string[];
}
