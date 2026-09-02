using System.ComponentModel.DataAnnotations;
using KellumsSecondChance.Server.Domain.Enums;

namespace KellumsSecondChance.Server.Dtos;

public class CreateBookingRequestDto : IValidatableObject
{
    [Required, StringLength(80)] public string FirstName { get; set; } = "";
    [Required, StringLength(80)] public string LastName { get; set; } = "";
    [Required, EmailAddress, StringLength(254)] public string Email { get; set; } = "";
    [Required, StringLength(30), RegularExpression(@"^\+?[\d\s().\-]{7,30}$")] public string Phone { get; set; } = "";
    [Required] public DateOnly PreferredDate { get; set; }
    [Required] public TimeOnly PreferredTime { get; set; }
    public DateOnly? AlternateDate { get; set; }
    public TimeOnly? AlternateTime { get; set; }
    [Required, StringLength(200)] public string Address { get; set; } = "";
    [Required, StringLength(100)] public string City { get; set; } = "";
    [Required, StringLength(2, MinimumLength = 2)] public string State { get; set; } = "";
    [Required, StringLength(12), RegularExpression(@"^[A-Za-z0-9 -]{3,12}$")] public string PostalCode { get; set; } = "";
    [Required, StringLength(3000, MinimumLength = 10)] public string ProjectDescription { get; set; } = "";
    [StringLength(2000)] public string? Notes { get; set; }
    [StringLength(300)] public string? CompanyWebsite { get; set; }
    [Range(0, int.MaxValue)] public int ElapsedMs { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (PreferredDate <= DateOnly.FromDateTime(DateTime.UtcNow))
            yield return new ValidationResult("Choose a preferred date in the future.", [nameof(PreferredDate)]);
        if (AlternateDate is { } alternate && alternate <= DateOnly.FromDateTime(DateTime.UtcNow))
            yield return new ValidationResult("Choose an alternate date in the future.", [nameof(AlternateDate)]);
        if (AlternateDate.HasValue != AlternateTime.HasValue)
            yield return new ValidationResult("Provide both an alternate date and time.", [nameof(AlternateDate), nameof(AlternateTime)]);
    }
}

public record BookingRequestResultDto(int Id, DateTime ReceivedAtUtc, string Message);
public record AdminBookingRequestDto(int Id, string FirstName, string LastName, string Email, string Phone,
    DateOnly PreferredDate, TimeOnly PreferredTime, DateOnly? AlternateDate, TimeOnly? AlternateTime,
    string Address, string City, string State, string PostalCode, string ProjectDescription, string? Notes,
    BookingRequestStatus Status, string? AdminNotes, DateTime CreatedAtUtc, DateTime? UpdatedAtUtc,
    DateTime? ConfirmedAtUtc, DateTime? CompletedAtUtc, DateTime? CancelledAtUtc, string RowVersion);

public class UpdateBookingRequestDto
{
    [EnumDataType(typeof(BookingRequestStatus))] public BookingRequestStatus Status { get; set; }
    [StringLength(4000)] public string? AdminNotes { get; set; }
    [Required] public string RowVersion { get; set; } = "";
}
