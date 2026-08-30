using KellumsSecondChance.Server.Domain.Enums;

namespace KellumsSecondChance.Server.Dtos;

/*
 * Read DTOs.
 *
 * EF entities are never returned from a controller: doing so leaks navigation
 * properties, internal flags (InternalNotes, SubmitterIpHash) and audit columns
 * into public JSON, and couples the wire format to the database schema.
 *
 * Property names match the TypeScript contract in
 * kellumssecondchance.client/src/lib/api/types.ts — keep the two in step.
 */

public record ImageDto(string Src, int Width, int Height, string Alt);

public record ServiceSummaryDto(
    int Id,
    string Slug,
    string Name,
    string Tagline,
    string Summary,
    string Icon,
    ImageDto? Image,
    int DisplayOrder,
    bool IsFeatured);

public record ServiceDetailDto(
    int Id,
    string Slug,
    string Name,
    string Tagline,
    string Summary,
    string Icon,
    ImageDto? Image,
    int DisplayOrder,
    bool IsFeatured,
    string Headline,
    string Introduction,
    IReadOnlyList<string> Includes,
    IReadOnlyList<string> BestFor,
    IReadOnlyList<string> Considerations,
    IReadOnlyList<string> RelatedProjectSlugs,
    string? MetaTitle,
    string? MetaDescription);

public record ProjectImageDto(
    int Id,
    string Src,
    int Width,
    int Height,
    string Alt,
    string Kind,
    string? Caption,
    int DisplayOrder,
    string? PairKey);

public record ProjectSummaryDto(
    int Id,
    string Slug,
    string Title,
    string Category,
    string CategorySlug,
    string? Location,
    string Summary,
    DateOnly? CompletedOn,
    ImageDto? CoverImage,
    bool IsFeatured,
    int DisplayOrder,
    bool HasBeforeAfter,
    bool IsSampleContent);

public record ProjectDetailDto(
    int Id,
    string Slug,
    string Title,
    string Category,
    string CategorySlug,
    string? Location,
    string Summary,
    DateOnly? CompletedOn,
    ImageDto? CoverImage,
    bool IsFeatured,
    int DisplayOrder,
    bool HasBeforeAfter,
    bool IsSampleContent,
    string Challenge,
    string Vision,
    string Transformation,
    string? Outcome,
    string? DurationLabel,
    string? PropertyType,
    IReadOnlyList<string> ServiceSlugs,
    IReadOnlyList<string> ServiceNames,
    IReadOnlyList<string> Highlights,
    IReadOnlyList<ProjectImageDto> Images,
    string? MetaTitle,
    string? MetaDescription);

public record ProjectCategoryDto(string Slug, string Name, int Count);

public record TestimonialDto(
    int Id,
    string FirstName,
    string? LastInitial,
    string? Location,
    byte Rating,
    string Quote,
    string? ProjectCategory,
    DateOnly? ReviewedOn,
    bool IsFeatured,
    bool IsSampleContent,
    string Source);

public record FaqItemDto(
    int Id,
    string Question,
    string Answer,
    string Category,
    string CategorySlug,
    int DisplayOrder,
    bool NeedsReview,
    string? ReviewNote);

public record ServiceAreaDto(
    int Id,
    string Name,
    string Kind,
    string? StateOrRegion,
    IReadOnlyList<string> PostalCodes,
    bool IsPrimary,
    string? Note,
    int DisplayOrder,
    bool IsSampleContent);

public record SocialLinkDto(string Label, string Href, string Icon);

/// <summary>
/// Business details served to the client. Any value the business has not supplied
/// stays null — the UI hides those elements rather than inventing a placeholder.
/// </summary>
public record SiteContentDto(
    string BusinessName,
    string Tagline,
    string? PhoneDisplay,
    string? PhoneE164,
    string? Email,
    string? ServiceAreaSummary,
    string? Licensing,
    string? Insurance,
    int? FoundedYear,
    string? AddressLocality,
    string? AddressRegion,
    IReadOnlyList<SocialLinkDto> SocialLinks);

/// <summary>Paged envelope for admin list endpoints.</summary>
public record PagedResultDto<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);

public record AdminUserDto(string Email, string DisplayName, IReadOnlyList<string> Roles);

public record EstimateRequestResultDto(string Reference, DateTime SubmittedAtUtc, string Message);

public record AdminEstimateRequestDto(
    int Id,
    string Reference,
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    IReadOnlyList<string> ProjectTypes,
    PropertyType PropertyType,
    string? AddressLine,
    string? City,
    string PostalCode,
    ProjectTimeline Timeline,
    BudgetRange BudgetRange,
    string Description,
    PreferredContactMethod PreferredContactMethod,
    string? ReferralSource,
    EstimateRequestStatus Status,
    string? InternalNotes,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);
