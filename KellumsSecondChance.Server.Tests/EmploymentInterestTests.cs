using System.ComponentModel.DataAnnotations;
using KellumsSecondChance.Server.Dtos;
using KellumsSecondChance.Server.Domain.Enums;

namespace KellumsSecondChance.Server.Tests;

public class EmploymentInterestTests
{
    [Fact]
    public void Public_contract_contains_no_sensitive_background_fields()
    {
        var names = typeof(CreateEmploymentInterestDto).GetProperties().Select(x => x.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);
        foreach (var forbidden in new[] { "CriminalHistory", "Convictions", "Incarceration", "Probation", "Parole", "RecoveryStatus", "Disability", "MedicalHistory" })
            Assert.DoesNotContain(forbidden, names);
    }

    [Fact]
    public void Preferred_contact_is_an_enum_and_rejects_undefined_values()
    {
        var dto = new CreateEmploymentInterestDto { FirstName="A", LastName="B", Email="a@example.com", WorkInterest="Crew", PreferredContactMethod=(PreferredContactMethod)999 };
        var results = new List<ValidationResult>();
        Assert.False(Validator.TryValidateObject(dto, new ValidationContext(dto), results, true));
        Assert.Contains(results, x => x.MemberNames.Contains(nameof(dto.PreferredContactMethod)));
    }

    [Fact]
    public void Required_fields_are_enforced()
    {
        var dto = new CreateEmploymentInterestDto();
        var results = new List<ValidationResult>();
        var valid = Validator.TryValidateObject(dto, new ValidationContext(dto), results, true);
        Assert.False(valid);
        Assert.Contains(results, x => x.MemberNames.Contains(nameof(CreateEmploymentInterestDto.FirstName)));
        Assert.Contains(results, x => x.MemberNames.Contains(nameof(CreateEmploymentInterestDto.WorkInterest)));
    }
}
