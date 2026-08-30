using KellumsSecondChance.Server.Domain.Enums;

namespace KellumsSecondChance.Server.Domain.Entities;

/// <summary>
/// Fields every editable content record carries so the admin layer can order,
/// activate and audit records uniformly.
/// </summary>
public abstract class ContentEntity
{
    public int Id { get; set; }

    /// <summary>Lower number sorts first.</summary>
    public int DisplayOrder { get; set; }

    /// <summary>Soft visibility switch. Inactive records never reach the public API.</summary>
    public bool IsActive { get; set; } = true;

    public DateTime CreatedAtUtc { get; set; }

    public DateTime? UpdatedAtUtc { get; set; }
}

/// <summary>A service the business offers. Editable, orderable and deactivatable.</summary>
public class RenovationService : ContentEntity
{
    public required string Slug { get; set; }

    public required string Name { get; set; }

    /// <summary>One-line hook shown on cards.</summary>
    public required string Tagline { get; set; }

    public required string Summary { get; set; }

    /// <summary>Icon registry key resolved by the client (see components/ui/Icon.tsx).</summary>
    public required string Icon { get; set; }

    public required string Headline { get; set; }

    public required string Introduction { get; set; }

    /// <summary>What the crew actually does. Stored as a JSON column.</summary>
    public List<string> Includes { get; set; } = [];

    public List<string> BestFor { get; set; } = [];

    /// <summary>Honest caveats shown on the service page.</summary>
    public List<string> Considerations { get; set; } = [];

    public string? ImagePath { get; set; }

    public int? ImageWidth { get; set; }

    public int? ImageHeight { get; set; }

    public string? ImageAlt { get; set; }

    /// <summary>
    /// Optimistic concurrency token. A service page carries several paragraphs
    /// of written copy, so a silent last-write-wins would discard somebody's
    /// work without telling them.
    /// </summary>
    public byte[]? RowVersion { get; set; }

    public bool IsFeatured { get; set; }

    public string? MetaTitle { get; set; }

    public string? MetaDescription { get; set; }

    public ICollection<ProjectService> ProjectServices { get; set; } = [];
}

/// <summary>A completed job, written up as a case study.</summary>
public class RenovationProject : ContentEntity
{
    public required string Slug { get; set; }

    public required string Title { get; set; }

    public required string CategoryName { get; set; }

    public required string CategorySlug { get; set; }

    /// <summary>Neighbourhood or city. Deliberately not a full address.</summary>
    public string? Location { get; set; }

    public required string Summary { get; set; }

    public required string Challenge { get; set; }

    public required string Vision { get; set; }

    public required string Transformation { get; set; }

    public string? Outcome { get; set; }

    public DateOnly? CompletedOn { get; set; }

    public string? DurationLabel { get; set; }

    public string? PropertyType { get; set; }

    public List<string> Highlights { get; set; } = [];

    public bool IsFeatured { get; set; }

    /// <summary>
    /// TRUE for seeded demonstration case studies. The public UI labels these so a
    /// written example is never presented as a record of real work.
    /// </summary>
    public bool IsSampleContent { get; set; }

    public string? MetaTitle { get; set; }

    public string? MetaDescription { get; set; }

    public ICollection<RenovationProjectImage> Images { get; set; } = [];

    public ICollection<ProjectService> ProjectServices { get; set; } = [];

    /// <summary>
    /// Optimistic concurrency token. A project edit is a long session — story
    /// text, service assignment, photo work — so a silent last-write-wins would
    /// quietly destroy someone's afternoon.
    /// </summary>
    public byte[]? RowVersion { get; set; }
}

/// <summary>One photograph belonging to a project.</summary>
public class RenovationProjectImage
{
    public int Id { get; set; }

    public int RenovationProjectId { get; set; }

    public RenovationProject? RenovationProject { get; set; }

    public required string Path { get; set; }

    /// <summary>Intrinsic pixel size, emitted to the client to prevent layout shift.</summary>
    public int Width { get; set; }

    public int Height { get; set; }

    /// <summary>Required. Empty string marks a purely decorative image.</summary>
    public required string AltText { get; set; }

    public string? Caption { get; set; }

    public ProjectImageKind Kind { get; set; }

    public int DisplayOrder { get; set; }

    /// <summary>Ties a Before to its matching After for the comparison slider.</summary>
    public string? PairKey { get; set; }

    /// <summary>
    /// Storage key for an uploaded file, e.g. "projects/7/f3a9…webp".
    ///
    /// Null for seeded artwork that ships with the app rather than being
    /// uploaded. Deletion only ever removes a physical file when this is set —
    /// the storage layer resolves it, and no client-supplied path is ever used.
    /// </summary>
    public string? StorageKey { get; set; }

    /// <summary>Bytes on disk, for the media overview. Null for bundled artwork.</summary>
    public long? FileSizeBytes { get; set; }

    /// <summary>Detected content type of an uploaded file, e.g. "image/webp".</summary>
    public string? ContentType { get; set; }

    /// <summary>
    /// When the file was uploaded. NULL for artwork that shipped with the
    /// application, whose creation date genuinely is not recorded — the same
    /// rule the rest of the codebase follows rather than stamping a made-up
    /// date on rows that predate this column.
    /// </summary>
    public DateTime? CreatedAtUtc { get; set; }
}

/// <summary>Join table: which services were performed on a project.</summary>
public class ProjectService
{
    public int RenovationProjectId { get; set; }

    public RenovationProject? RenovationProject { get; set; }

    public int RenovationServiceId { get; set; }

    public RenovationService? RenovationService { get; set; }

    public int DisplayOrder { get; set; }
}

/// <summary>A customer review.</summary>
public class CustomerTestimonial : ContentEntity
{
    public required string FirstName { get; set; }

    /// <summary>Last initial only — we never publish a customer's full surname.</summary>
    public string? LastInitial { get; set; }

    public string? Location { get; set; }

    /// <summary>1–5.</summary>
    public byte Rating { get; set; }

    public required string Quote { get; set; }

    public string? ProjectCategory { get; set; }

    public DateOnly? ReviewedOn { get; set; }

    public bool IsFeatured { get; set; }

    /// <summary>
    /// TRUE for seeded example reviews. These are labelled everywhere they appear
    /// and are excluded from review structured data.
    /// </summary>
    public bool IsSampleContent { get; set; }

    public TestimonialSource Source { get; set; } = TestimonialSource.Direct;
}

/// <summary>A question and answer.</summary>
public class FaqItem : ContentEntity
{
    public required string Question { get; set; }

    public required string Answer { get; set; }

    public required string Category { get; set; }

    public required string CategorySlug { get; set; }

    /// <summary>
    /// TRUE while the answer depends on a business policy nobody has set yet.
    ///
    /// Such an item is withheld from the public FAQ *and* from the FAQ
    /// structured data — the same rule the site applies to a null phone number.
    /// Publishing a plausible-sounding guess about deposits or warranties would
    /// be a fabricated claim, so nothing is published at all until it is answered.
    /// </summary>
    public bool NeedsReview { get; set; }

    /// <summary>Staff-only note describing what the business still has to decide.</summary>
    public string? ReviewNote { get; set; }

    /// <summary>
    /// Optimistic concurrency token. Answers are written prose, and the review
    /// gate makes a lost edit worse than usual: two people could each believe
    /// they had answered a withheld question.
    /// </summary>
    public byte[]? RowVersion { get; set; }
}

/// <summary>Somewhere the business will travel to.</summary>
public class ServiceArea : ContentEntity
{
    public required string Name { get; set; }

    public ServiceAreaKind Kind { get; set; }

    public string? StateOrRegion { get; set; }

    public List<string> PostalCodes { get; set; } = [];

    public bool IsPrimary { get; set; }

    public string? Note { get; set; }

    /// <summary>TRUE while the entry is placeholder geography awaiting confirmation.</summary>
    public bool IsSampleContent { get; set; }
}

/// <summary>
/// Key/value business configuration (phone, email, hours, social links).
/// Overrides the client's compile-time defaults when a value is present.
/// </summary>
public class SiteSetting
{
    public required string Key { get; set; }

    public string? Value { get; set; }

    public string? Description { get; set; }

    public DateTime? UpdatedAtUtc { get; set; }
}
