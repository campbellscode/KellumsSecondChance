using KellumsSecondChance.Server.Domain.Enums;

namespace KellumsSecondChance.Server.Domain.Entities;

/// <summary>
/// A dated internal note against a lead.
///
/// "Called — wants an estimate next Thursday." "Waiting on cabinet dimensions."
/// A separate entity rather than one overwritable text field, so the business
/// keeps the whole conversation rather than only its most recent line.
///
/// NEVER exposed by a public endpoint. Only the admin API returns these.
/// </summary>
public class EstimateRequestNote
{
    public int Id { get; set; }

    public int EstimateRequestId { get; set; }

    public EstimateRequest? EstimateRequest { get; set; }

    public required string Note { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    /// <summary>Identity user id of the author. Never leaves the admin API.</summary>
    public string? CreatedByUserId { get; set; }

    /// <summary>
    /// Author's display name, denormalised at write time so the trail stays
    /// readable after an account is renamed or removed.
    /// </summary>
    public string? CreatedByDisplayName { get; set; }
}

/// <summary>
/// One recorded move through the lead pipeline.
///
/// Rows only exist from the first status change made after this feature shipped;
/// nothing is back-filled, because inventing history the business never recorded
/// would be exactly the kind of fabrication this codebase refuses to do.
/// </summary>
public class EstimateRequestStatusHistory
{
    public int Id { get; set; }

    public int EstimateRequestId { get; set; }

    public EstimateRequest? EstimateRequest { get; set; }

    public EstimateRequestStatus PreviousStatus { get; set; }

    public EstimateRequestStatus NewStatus { get; set; }

    public DateTime ChangedAtUtc { get; set; }

    public string? ChangedByUserId { get; set; }

    public string? ChangedByDisplayName { get; set; }
}
