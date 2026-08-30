using System.ComponentModel.DataAnnotations;
using KellumsSecondChance.Server.Domain.Enums;

namespace KellumsSecondChance.Server.Dtos;

/// <summary>
/// Public estimate submission.
///
/// This is the only endpoint that accepts anonymous writes, so validation here
/// is a security boundary, not a convenience. Every constraint is enforced
/// server-side regardless of what the browser did, and the lengths match the
/// column definitions so a valid DTO can never fail at the database.
/// </summary>
public class CreateEstimateRequestDto
{
    [Required(ErrorMessage = "We need a first name.")]
    [StringLength(80, MinimumLength = 1, ErrorMessage = "That name is too long.")]
    public string FirstName { get; set; } = string.Empty;

    [Required(ErrorMessage = "We need a last name.")]
    [StringLength(80, MinimumLength = 1, ErrorMessage = "That name is too long.")]
    public string LastName { get; set; } = string.Empty;

    [Required(ErrorMessage = "We need an email address to reply to.")]
    [EmailAddress(ErrorMessage = "That does not look like a valid email address.")]
    // Requires a dotted domain, matching the client's check — without this the
    // browser would reject an address the server quietly accepted. Surrounding
    // whitespace is tolerated (autofill and paste add it); the service trims.
    [RegularExpression(
        @"^\s*[^\s@]+@[^\s@]+\.[^\s@]{2,}\s*$",
        ErrorMessage = "That does not look like a valid email address.")]
    [StringLength(254, ErrorMessage = "That email address is too long.")]
    public string Email { get; set; } = string.Empty;

    [StringLength(30, ErrorMessage = "That phone number is too long.")]
    [RegularExpression(
        @"^\+?[\d\s().\-]{7,30}$",
        ErrorMessage = "That does not look like a valid phone number.")]
    public string? Phone { get; set; }

    /// <summary>Service slugs. Bounded so a caller cannot post an unbounded array.</summary>
    [MaxLength(20, ErrorMessage = "That is more project types than we can accept.")]
    public List<string> ProjectTypeSlugs { get; set; } = [];

    [EnumDataType(typeof(PropertyType), ErrorMessage = "That is not a property type we recognise.")]
    public PropertyType PropertyType { get; set; } = PropertyType.Other;

    [StringLength(250, ErrorMessage = "That address is too long.")]
    public string? AddressLine { get; set; }

    [StringLength(120, ErrorMessage = "That is too long for a city name.")]
    public string? City { get; set; }

    [Required(ErrorMessage = "We need a ZIP or postal code to check we cover your area.")]
    [StringLength(12, MinimumLength = 3, ErrorMessage = "That does not look like a valid ZIP or postal code.")]
    [RegularExpression(
        @"^\s*[A-Za-z0-9][A-Za-z0-9\s\-]{1,10}[A-Za-z0-9]\s*$",
        ErrorMessage = "That does not look like a valid ZIP or postal code.")]
    public string PostalCode { get; set; } = string.Empty;

    [EnumDataType(typeof(ProjectTimeline), ErrorMessage = "That is not a timeline we recognise.")]
    public ProjectTimeline Timeline { get; set; } = ProjectTimeline.NotSure;

    [EnumDataType(typeof(BudgetRange), ErrorMessage = "That is not a budget range we recognise.")]
    public BudgetRange BudgetRange { get; set; } = BudgetRange.NotSure;

    [Required(ErrorMessage = "Tell us a little about what you have in mind.")]
    [StringLength(4000, MinimumLength = 10, ErrorMessage = "A sentence or two helps us understand the job.")]
    public string Description { get; set; } = string.Empty;

    [EnumDataType(typeof(PreferredContactMethod), ErrorMessage = "That is not a contact method we recognise.")]
    public PreferredContactMethod PreferredContactMethod { get; set; } = PreferredContactMethod.NoPreference;

    [StringLength(60, ErrorMessage = "That referral source is too long.")]
    public string? ReferralSource { get; set; }

    /// <summary>
    /// Honeypot. The real form hides this field from both sighted users and
    /// assistive tech, so any value at all means an automated submission.
    /// </summary>
    [StringLength(300)]
    public string? CompanyWebsite { get; set; }

    /// <summary>
    /// Milliseconds the visitor spent on the form. Submissions completed faster
    /// than a human plausibly could are rejected.
    /// </summary>
    [Range(0, int.MaxValue)]
    public int ElapsedMs { get; set; }
}

public class AdminLoginDto
{
    [Required]
    [EmailAddress]
    [StringLength(254)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [StringLength(256, MinimumLength = 1)]
    public string Password { get; set; } = string.Empty;
}
