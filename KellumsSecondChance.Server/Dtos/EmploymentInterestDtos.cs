using System.ComponentModel.DataAnnotations;
using KellumsSecondChance.Server.Domain.Enums;

namespace KellumsSecondChance.Server.Dtos;

public class CreateEmploymentInterestDto
{
    [Required, StringLength(80)] public string FirstName { get; set; } = "";
    [Required, StringLength(80)] public string LastName { get; set; } = "";
    [Required, EmailAddress, StringLength(254)] public string Email { get; set; } = "";
    [StringLength(30), RegularExpression(@"^\+?[\d\s().\-]{7,30}$")] public string? Phone { get; set; }
    [EnumDataType(typeof(PreferredContactMethod))] public PreferredContactMethod PreferredContactMethod { get; set; } = PreferredContactMethod.NoPreference;
    [StringLength(2000)] public string? GeneralWorkExperience { get; set; }
    [StringLength(2000)] public string? AreasOfExperience { get; set; }
    [Required, StringLength(300, MinimumLength = 2)] public string WorkInterest { get; set; } = "";
    [StringLength(300)] public string? Availability { get; set; }
    [StringLength(3000)] public string? Message { get; set; }
    [StringLength(300)] public string? CompanyWebsite { get; set; }
    [Range(0, int.MaxValue)] public int ElapsedMs { get; set; }
}

public record EmploymentInterestResultDto(DateTime ReceivedAtUtc, string Message);

public record AdminEmploymentInterestDto(
    int Id, string FirstName, string LastName, string Email, string? Phone,
    PreferredContactMethod PreferredContactMethod, string? GeneralWorkExperience,
    string? AreasOfExperience, string WorkInterest, string? Availability, string? Message,
    EmploymentInterestStatus Status, string? InternalNotes, DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc, string RowVersion, int NotificationAttemptCount,
    DateTime? NotificationAttemptedAtUtc, DateTime? NotificationDeliveredAtUtc,
    DateTime? NotificationFailedAtUtc, string? NotificationFailureCategory);

public class UpdateEmploymentInterestDto
{
    [EnumDataType(typeof(EmploymentInterestStatus))]
    public EmploymentInterestStatus Status { get; set; }

    [StringLength(4000)]
    public string? InternalNotes { get; set; }

    [Required]
    public string RowVersion { get; set; } = "";
}
