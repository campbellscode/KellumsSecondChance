using KellumsSecondChance.Server.Domain.Enums;

namespace KellumsSecondChance.Server.Domain.Entities;

public class BookingRequest
{
    public int Id { get; set; }
    public required string FirstName { get; set; }
    public required string LastName { get; set; }
    public required string Email { get; set; }
    public required string Phone { get; set; }
    public DateOnly PreferredDate { get; set; }
    public TimeOnly PreferredTime { get; set; }
    public DateOnly? AlternateDate { get; set; }
    public TimeOnly? AlternateTime { get; set; }
    public required string Address { get; set; }
    public required string City { get; set; }
    public required string State { get; set; }
    public required string PostalCode { get; set; }
    public required string ProjectDescription { get; set; }
    public string? Notes { get; set; }
    public BookingRequestStatus Status { get; set; } = BookingRequestStatus.Pending;
    public string? AdminNotes { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
    public DateTime? ConfirmedAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public DateTime? CancelledAtUtc { get; set; }
    public string? SubmitterIpHash { get; set; }
    public byte[]? RowVersion { get; set; }
}
