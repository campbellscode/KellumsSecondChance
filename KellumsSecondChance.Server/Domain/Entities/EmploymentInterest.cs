using KellumsSecondChance.Server.Domain.Enums;

namespace KellumsSecondChance.Server.Domain.Entities;

/// <summary>Private, preliminary employment enquiry. It is not a job application.</summary>
public class EmploymentInterest
{
    public int Id { get; set; }
    public required string FirstName { get; set; }
    public required string LastName { get; set; }
    public required string Email { get; set; }
    public string? Phone { get; set; }
    public PreferredContactMethod PreferredContactMethod { get; set; }
    public string? GeneralWorkExperience { get; set; }
    public string? AreasOfExperience { get; set; }
    public required string WorkInterest { get; set; }
    public string? Availability { get; set; }
    public string? Message { get; set; }
    public EmploymentInterestStatus Status { get; set; } = EmploymentInterestStatus.New;
    public string? InternalNotes { get; set; }
    public int NotificationAttemptCount { get; set; }
    public DateTime? NotificationAttemptedAtUtc { get; set; }
    public DateTime? NotificationDeliveredAtUtc { get; set; }
    public DateTime? NotificationFailedAtUtc { get; set; }
    public string? NotificationFailureCategory { get; set; }
    public string? SubmitterIpHash { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
    public byte[]? RowVersion { get; set; }
}
