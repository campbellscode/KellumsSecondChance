using System.ComponentModel.DataAnnotations;
using KellumsSecondChance.Server.Domain.Enums;

namespace KellumsSecondChance.Server.Dtos;

/*
 * Admin write contracts.
 *
 * These exist so a request can only set the fields an administrator is allowed
 * to set. Binding straight to an EF entity would let a crafted payload assign
 * Id, CreatedAtUtc, IsSampleContent, SubmitterIpHash or a navigation collection —
 * the classic overposting hole. Nothing here exposes an entity.
 */

/// <summary>Optimistic concurrency token, round-tripped as base64.</summary>
public interface IConcurrencyGuarded
{
    string? RowVersion { get; }
}

/* ------------------------------------------------------------------ shared */

/// <summary>
/// Bounds every entry in a string list.
///
/// [MaxLength] on a List caps how MANY items there are; nothing in
/// DataAnnotations caps how long each one is. Without this, twelve highlights
/// of ten thousand characters each pass validation and then overflow the JSON
/// column at SaveChanges — a 500 for what is really "that is too long".
/// </summary>
[AttributeUsage(AttributeTargets.Property)]
public sealed class StringLengthEachAttribute(int maximumLength) : ValidationAttribute
{
    public int MaximumLength { get; } = maximumLength;

    protected override ValidationResult? IsValid(object? value, ValidationContext context)
    {
        if (value is not IEnumerable<string> items) return ValidationResult.Success;

        foreach (var item in items)
        {
            if (item is not null && item.Length > MaximumLength)
            {
                return new ValidationResult(
                    $"Keep each entry to {MaximumLength} characters or fewer.",
                    context.MemberName is null ? null : [context.MemberName]);
            }
        }

        return ValidationResult.Success;
    }
}

/// <summary>Slugs are public URLs; the rules are enforced identically everywhere.</summary>
public static class SlugRules
{
    public const string Pattern = @"^[a-z0-9]+(?:-[a-z0-9]+)*$";

    public const string Message =
        "Use lowercase letters, numbers and single hyphens only — for example \"maple-street-kitchen\".";
}

/* ---------------------------------------------------------------- projects */

public class ProjectWriteDto : IConcurrencyGuarded
{
    [Required]
    [StringLength(200, MinimumLength = 2)]
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Leave null on create to derive one from the title. Once a project exists
    /// the slug is only changed when this is explicitly supplied — a published
    /// URL must not move every time somebody rewords a heading.
    /// </summary>
    [StringLength(120, MinimumLength = 2)]
    [RegularExpression(SlugRules.Pattern, ErrorMessage = SlugRules.Message)]
    public string? Slug { get; set; }

    [Required]
    [StringLength(120)]
    public string CategoryName { get; set; } = string.Empty;

    [Required]
    [StringLength(120)]
    [RegularExpression(SlugRules.Pattern, ErrorMessage = SlugRules.Message)]
    public string CategorySlug { get; set; } = string.Empty;

    [StringLength(120)]
    public string? Location { get; set; }

    [Required]
    [StringLength(600, MinimumLength = 10)]
    public string Summary { get; set; } = string.Empty;

    [Required]
    [StringLength(2500, MinimumLength = 10)]
    public string Challenge { get; set; } = string.Empty;

    [Required]
    [StringLength(2500, MinimumLength = 10)]
    public string Vision { get; set; } = string.Empty;

    [Required]
    [StringLength(2500, MinimumLength = 10)]
    public string Transformation { get; set; } = string.Empty;

    [StringLength(2000)]
    public string? Outcome { get; set; }

    public DateOnly? CompletedOn { get; set; }

    [StringLength(120)]
    public string? DurationLabel { get; set; }

    [StringLength(120)]
    public string? PropertyType { get; set; }

    [MaxLength(12)]
    [StringLengthEach(200)]
    public List<string> Highlights { get; set; } = [];

    /// <summary>Ids of ACTIVE services. Inactive ids are rejected on create/update.</summary>
    [MaxLength(20)]
    public List<int> ServiceIds { get; set; } = [];

    public bool IsFeatured { get; set; }

    /// <summary>False = draft. The public API never returns a draft.</summary>
    public bool IsActive { get; set; }

    [Range(0, 10000)]
    public int DisplayOrder { get; set; }

    [StringLength(200)]
    public string? MetaTitle { get; set; }

    [StringLength(320)]
    public string? MetaDescription { get; set; }

    public string? RowVersion { get; set; }
}

/// <summary>Everything the project editor needs, including drafts and photos.</summary>
public record AdminProjectDto(
    int Id,
    string Slug,
    string Title,
    string CategoryName,
    string CategorySlug,
    string? Location,
    string Summary,
    string Challenge,
    string Vision,
    string Transformation,
    string? Outcome,
    DateOnly? CompletedOn,
    string? DurationLabel,
    string? PropertyType,
    IReadOnlyList<string> Highlights,
    IReadOnlyList<int> ServiceIds,
    bool IsFeatured,
    bool IsActive,
    bool IsSampleContent,
    int DisplayOrder,
    string? MetaTitle,
    string? MetaDescription,
    IReadOnlyList<AdminProjectImageDto> Images,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc,
    string? RowVersion);

/// <summary>Row in the admin project list.</summary>
public record AdminProjectListItemDto(
    int Id,
    string Slug,
    string Title,
    string CategoryName,
    string? Location,
    bool IsFeatured,
    bool IsActive,
    bool IsSampleContent,
    int DisplayOrder,
    DateOnly? CompletedOn,
    int ImageCount,
    bool HasCoverImage,
    bool HasBeforeAfter,
    DateTime? UpdatedAtUtc);

public record AdminProjectImageDto(
    int Id,
    string Src,
    int Width,
    int Height,
    string Alt,
    string Kind,
    string? Caption,
    int DisplayOrder,
    string? PairKey,
    bool IsUploaded,
    long? FileSizeBytes);

public class ProjectImageUpdateDto
{
    [Required]
    [StringLength(300)]
    public string AltText { get; set; } = string.Empty;

    [StringLength(300)]
    public string? Caption { get; set; }

    [EnumDataType(typeof(ProjectImageKind))]
    public ProjectImageKind Kind { get; set; }

    [Range(0, 10000)]
    public int DisplayOrder { get; set; }

    /// <summary>
    /// Pairing is managed through the pair endpoints, which generate keys. This
    /// is accepted only so an existing key survives an unrelated edit.
    /// </summary>
    [StringLength(60)]
    public string? PairKey { get; set; }
}

/// <summary>Reorder request: before/after pair keys in their new order.</summary>
public class PairReorderDto
{
    [Required]
    [MaxLength(100)]
    public List<string> OrderedPairKeys { get; set; } = [];
}

/// <summary>Reorder request: image ids in their new order.</summary>
public class ReorderDto
{
    [Required]
    [MaxLength(200)]
    public List<int> OrderedIds { get; set; } = [];
}

/// <summary>Builds or updates one before/after pair. Either side may be null.</summary>
public class BeforeAfterPairDto
{
    public int? BeforeImageId { get; set; }

    public int? AfterImageId { get; set; }

    /// <summary>Null creates a new pair; supplying one updates that pair.</summary>
    [StringLength(60)]
    public string? PairKey { get; set; }
}

/// <summary>
/// A single standalone image: the photograph on a service page, or the social
/// sharing card. Deliberately NOT AdminProjectImageDto — neither of these has a
/// kind, a pair or a position, and shipping those fields empty would suggest
/// they mean something.
/// </summary>
public record UploadedImageDto(
    string Src,
    int Width,
    int Height,
    string Alt,
    long SizeBytes);

/* ---------------------------------------------------------------- services */

public class ServiceWriteDto : IConcurrencyGuarded
{
    [Required]
    [StringLength(120, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [StringLength(100, MinimumLength = 2)]
    [RegularExpression(SlugRules.Pattern, ErrorMessage = SlugRules.Message)]
    public string? Slug { get; set; }

    [Required]
    [StringLength(160)]
    public string Tagline { get; set; } = string.Empty;

    [Required]
    [StringLength(500, MinimumLength = 10)]
    public string Summary { get; set; } = string.Empty;

    [Required]
    [StringLength(60)]
    public string Icon { get; set; } = string.Empty;

    [Required]
    [StringLength(200)]
    public string Headline { get; set; } = string.Empty;

    [Required]
    [StringLength(2000, MinimumLength = 10)]
    public string Introduction { get; set; } = string.Empty;

    [MaxLength(20)]
    [StringLengthEach(200)]
    public List<string> Includes { get; set; } = [];

    [MaxLength(12)]
    [StringLengthEach(200)]
    public List<string> BestFor { get; set; } = [];

    [MaxLength(12)]
    [StringLengthEach(200)]
    public List<string> Considerations { get; set; } = [];

    public bool IsFeatured { get; set; }

    public bool IsActive { get; set; }

    [Range(0, 10000)]
    public int DisplayOrder { get; set; }

    [StringLength(200)]
    public string? MetaTitle { get; set; }

    [StringLength(320)]
    public string? MetaDescription { get; set; }

    public string? RowVersion { get; set; }
}

public record AdminServiceDto(
    int Id,
    string Slug,
    string Name,
    string Tagline,
    string Summary,
    string Icon,
    string Headline,
    string Introduction,
    IReadOnlyList<string> Includes,
    IReadOnlyList<string> BestFor,
    IReadOnlyList<string> Considerations,
    ImageDto? Image,
    bool IsFeatured,
    bool IsActive,
    int DisplayOrder,
    string? MetaTitle,
    string? MetaDescription,
    int LinkedProjectCount,
    DateTime? UpdatedAtUtc,
    string? RowVersion);

/* ------------------------------------------------------------ testimonials */

public class TestimonialWriteDto
{
    [Required]
    [StringLength(80, MinimumLength = 1)]
    public string FirstName { get; set; } = string.Empty;

    [StringLength(4)]
    public string? LastInitial { get; set; }

    [StringLength(120)]
    public string? Location { get; set; }

    [Range(1, 5)]
    public byte Rating { get; set; } = 5;

    [Required]
    [StringLength(1500, MinimumLength = 10)]
    public string Quote { get; set; } = string.Empty;

    [StringLength(120)]
    public string? ProjectCategory { get; set; }

    public DateOnly? ReviewedOn { get; set; }

    public bool IsFeatured { get; set; }

    public bool IsActive { get; set; }

    [Range(0, 10000)]
    public int DisplayOrder { get; set; }

    [EnumDataType(typeof(TestimonialSource))]
    public TestimonialSource Source { get; set; } = TestimonialSource.Direct;
}

public record AdminTestimonialDto(
    int Id,
    string FirstName,
    string? LastInitial,
    string? Location,
    byte Rating,
    string Quote,
    string? ProjectCategory,
    DateOnly? ReviewedOn,
    bool IsFeatured,
    bool IsActive,
    bool IsSampleContent,
    int DisplayOrder,
    string Source,
    DateTime? UpdatedAtUtc);

/* --------------------------------------------------------------------- faq */

public class FaqWriteDto : IConcurrencyGuarded
{
    [Required]
    [StringLength(300, MinimumLength = 5)]
    public string Question { get; set; } = string.Empty;

    /// <summary>May be empty ONLY while NeedsReview is true.</summary>
    [StringLength(2500)]
    public string Answer { get; set; } = string.Empty;

    [Required]
    [StringLength(120)]
    public string Category { get; set; } = string.Empty;

    [Required]
    [StringLength(120)]
    [RegularExpression(SlugRules.Pattern, ErrorMessage = SlugRules.Message)]
    public string CategorySlug { get; set; } = string.Empty;

    /// <summary>
    /// True withholds the item from the public FAQ and from FAQ structured data.
    /// Clearing it requires a real answer — enforced server-side.
    /// </summary>
    public bool NeedsReview { get; set; }

    [StringLength(500)]
    public string? ReviewNote { get; set; }

    public bool IsActive { get; set; }

    [Range(0, 10000)]
    public int DisplayOrder { get; set; }

    public string? RowVersion { get; set; }
}

public record AdminFaqDto(
    int Id,
    string Question,
    string Answer,
    string Category,
    string CategorySlug,
    bool NeedsReview,
    string? ReviewNote,
    bool IsActive,
    int DisplayOrder,
    DateTime? UpdatedAtUtc,
    string? RowVersion);

/* ----------------------------------------------------------- service areas */

public class ServiceAreaWriteDto
{
    [Required]
    [StringLength(120, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [EnumDataType(typeof(ServiceAreaKind))]
    public ServiceAreaKind Kind { get; set; } = ServiceAreaKind.City;

    [StringLength(80)]
    public string? StateOrRegion { get; set; }

    [MaxLength(200)]
    [StringLengthEach(20)]
    public List<string> PostalCodes { get; set; } = [];

    public bool IsPrimary { get; set; }

    [StringLength(300)]
    public string? Note { get; set; }

    public bool IsActive { get; set; }

    [Range(0, 10000)]
    public int DisplayOrder { get; set; }
}

public record AdminServiceAreaDto(
    int Id,
    string Name,
    string Kind,
    string? StateOrRegion,
    IReadOnlyList<string> PostalCodes,
    bool IsPrimary,
    string? Note,
    bool IsActive,
    bool IsSampleContent,
    int DisplayOrder,
    DateTime? UpdatedAtUtc);

/* ------------------------------------------------------------ site settings */

/// <summary>
/// The editable business profile.
///
/// Every field is optional. Null means "not supplied", and the public site omits
/// whatever it would have rendered rather than printing a placeholder — the rule
/// the whole codebase is built on. Saving a blank field clears it back to null.
/// </summary>
public class SiteSettingsWriteDto
{
    [StringLength(120)]
    public string? BusinessName { get; set; }

    [StringLength(200)]
    public string? Tagline { get; set; }

    [StringLength(40)]
    public string? PhoneDisplay { get; set; }

    [RegularExpression(@"^\+[1-9]\d{7,14}$",
        ErrorMessage = "Use full international format, for example +15135550123.")]
    [StringLength(16)]
    public string? PhoneE164 { get; set; }

    [EmailAddress]
    [StringLength(254)]
    public string? Email { get; set; }

    [StringLength(200)]
    public string? AddressLine1 { get; set; }

    [StringLength(200)]
    public string? AddressLine2 { get; set; }

    [StringLength(120)]
    public string? AddressLocality { get; set; }

    [StringLength(80)]
    public string? AddressRegion { get; set; }

    [StringLength(20)]
    public string? AddressPostalCode { get; set; }

    /// <summary>A business may hold an address without publishing it.</summary>
    public bool PublishAddress { get; set; }

    [StringLength(400)]
    public string? ServiceAreaSummary { get; set; }

    [StringLength(300)]
    public string? Licensing { get; set; }

    [StringLength(300)]
    public string? Insurance { get; set; }

    [Range(1900, 2200)]
    public int? FoundedYear { get; set; }

    [MaxLength(8)]
    public List<SocialLinkWriteDto> SocialLinks { get; set; } = [];

    /// <summary>
    /// When the business is reachable. Empty means the site shows no hours —
    /// which is the honest default, because nobody has supplied them.
    /// </summary>
    [MaxLength(10)]
    public List<OfficeHoursWriteDto> OfficeHours { get; set; } = [];

    [StringLength(200)]
    public string? SiteUrl { get; set; }

    /// <summary>Root-relative path to a 1200x630 raster social card. Never SVG.</summary>
    [StringLength(300)]
    public string? OgImagePath { get; set; }

    [StringLength(500)]
    public string? GoogleReviewUrl { get; set; }
}

public class OfficeHoursWriteDto
{
    [Required]
    [StringLength(60)]
    public string Label { get; set; } = string.Empty;

    [Required]
    [StringLength(80)]
    public string Hours { get; set; } = string.Empty;
}

public class SocialLinkWriteDto
{
    [Required]
    [StringLength(60)]
    public string Label { get; set; } = string.Empty;

    [Required]
    [StringLength(300)]
    public string Href { get; set; } = string.Empty;

    [Required]
    [StringLength(40)]
    public string Icon { get; set; } = "facebook";
}

/// <summary>What the settings screen loads. Mirrors the write shape exactly.</summary>
public record AdminSiteSettingsDto(
    string? BusinessName,
    string? Tagline,
    string? PhoneDisplay,
    string? PhoneE164,
    string? Email,
    string? AddressLine1,
    string? AddressLine2,
    string? AddressLocality,
    string? AddressRegion,
    string? AddressPostalCode,
    bool PublishAddress,
    string? ServiceAreaSummary,
    string? Licensing,
    string? Insurance,
    int? FoundedYear,
    IReadOnlyList<SocialLinkDto> SocialLinks,
    IReadOnlyList<OfficeHoursDto> OfficeHours,
    string? SiteUrl,
    string? OgImagePath,
    string? GoogleReviewUrl);

/* -------------------------------------------------------- estimate requests */

public class EstimateRequestStatusUpdateDto : IConcurrencyGuarded
{
    [Required]
    [EnumDataType(typeof(EstimateRequestStatus))]
    public EstimateRequestStatus Status { get; set; }

    public string? RowVersion { get; set; }
}

public class EstimateRequestNoteWriteDto
{
    [Required]
    [StringLength(4000, MinimumLength = 1)]
    public string Note { get; set; } = string.Empty;
}

public record EstimateRequestNoteDto(
    int Id,
    string Note,
    DateTime CreatedAtUtc,
    string? CreatedByDisplayName);

public record EstimateRequestStatusHistoryDto(
    int Id,
    EstimateRequestStatus PreviousStatus,
    EstimateRequestStatus NewStatus,
    DateTime ChangedAtUtc,
    string? ChangedByDisplayName);

/// <summary>The full lead record, including the internal trail. Admin only.</summary>
public record AdminEstimateRequestDetailDto(
    AdminEstimateRequestDto Request,
    IReadOnlyList<EstimateRequestNoteDto> Notes,
    IReadOnlyList<EstimateRequestStatusHistoryDto> History,
    string? RowVersion);

/* ------------------------------------------------------------- dashboard */

public record DashboardMetricsDto(
    int NewLeads,
    int AwaitingFollowUp,
    int EstimatesScheduled,
    int EstimatesSent,
    int Won,
    int Lost,
    int Archived,
    int TotalLeads,
    int LeadsLast30Days,
    int PublishedProjects,
    int DraftProjects,
    int PublishedServices,
    int InactiveServices,
    int PublishedTestimonials,
    int UnpublishedTestimonials,
    int PublishedFaqs,
    int FaqsAwaitingReview,
    int ActiveServiceAreas);

/// <summary>One thing that needs a person's attention, with a link to fix it.</summary>
public record AttentionItemDto(
    string Kind,
    string Title,
    string Detail,
    string ActionPath,
    string Severity);

public record DashboardDto(
    DashboardMetricsDto Metrics,
    IReadOnlyList<AdminEstimateRequestDto> RecentRequests,
    IReadOnlyList<AttentionItemDto> NeedsAttention);
