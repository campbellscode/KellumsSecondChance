using KellumsSecondChance.Server.Domain.Enums;

namespace KellumsSecondChance.Server.Domain.Entities;

/// <summary>
/// A lead submitted through the public estimate form.
///
/// Contains personal data, so the shape is deliberately minimal: we store what
/// is needed to reply and nothing else. The submitter's IP is kept only as a
/// salted one-way hash, purely for abuse rate-limiting — never in the clear.
/// </summary>
public class EstimateRequest
{
    public int Id { get; set; }

    /// <summary>
    /// Human-quotable reference shown on the confirmation screen, e.g. "KSC-7QF3M2".
    /// Unique, and deliberately not sequential so it leaks no volume information.
    /// </summary>
    public required string Reference { get; set; }

    public required string FirstName { get; set; }

    public required string LastName { get; set; }

    public required string Email { get; set; }

    public string? Phone { get; set; }

    /// <summary>Service slugs the visitor selected. Stored as a JSON column.</summary>
    public List<string> ProjectTypeSlugs { get; set; } = [];

    public PropertyType PropertyType { get; set; }

    public string? AddressLine { get; set; }

    public string? City { get; set; }

    public required string PostalCode { get; set; }

    public ProjectTimeline Timeline { get; set; }

    public BudgetRange BudgetRange { get; set; }

    public required string Description { get; set; }

    public PreferredContactMethod PreferredContactMethod { get; set; }

    public string? ReferralSource { get; set; }
    public string? LandingPage { get; set; }
    public string? ReferrerUrl { get; set; }
    public string? UtmSource { get; set; }
    public string? UtmMedium { get; set; }
    public string? UtmCampaign { get; set; }
    public string? UtmTerm { get; set; }
    public string? UtmContent { get; set; }
    public int NotificationAttemptCount { get; set; }
    public DateTime? NotificationAttemptedAtUtc { get; set; }
    public DateTime? NotificationDeliveredAtUtc { get; set; }
    public DateTime? NotificationFailedAtUtc { get; set; }
    public string? NotificationFailureCategory { get; set; }

    public EstimateRequestStatus Status { get; set; } = EstimateRequestStatus.New;

    /// <summary>Staff-only notes. Never returned by a public endpoint.</summary>
    public string? InternalNotes { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public DateTime? UpdatedAtUtc { get; set; }

    /// <summary>Salted SHA-256 of the submitting IP. Not reversible to an address.</summary>
    public string? SubmitterIpHash { get; set; }

    /// <summary>Truncated user agent, kept for spam triage only.</summary>
    public string? UserAgent { get; set; }

    /// <summary>
    /// Optimistic concurrency token.
    ///
    /// Two people triaging the same inbox is the normal case, not an edge case:
    /// without this, whoever saves second silently discards the first person's
    /// status change. A stale token produces a 409 the console can explain.
    /// </summary>
    public byte[]? RowVersion { get; set; }

    public ICollection<EstimateRequestNote> Notes { get; set; } = [];

    public ICollection<EstimateRequestStatusHistory> StatusHistory { get; set; } = [];
}
