using System.ComponentModel.DataAnnotations;
using KellumsSecondChance.Server.Configuration;
using KellumsSecondChance.Server.Domain.Enums;
using KellumsSecondChance.Server.Dtos;
using KellumsSecondChance.Server.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace KellumsSecondChance.Server.Tests;

public class EstimateRequestServiceTests : IDisposable
{
    private readonly TestDatabase _fixture = new();
    private readonly EstimateRequestService _service;

    private static readonly AntiSpamOptions AntiSpam = new()
    {
        IpHashSalt = "test-salt",
        MinimumFillMilliseconds = 3000,
        MaxSubmissionsPerWindow = 3,
        Window = TimeSpan.FromHours(1),
    };

    public EstimateRequestServiceTests()
    {
        _service = new EstimateRequestService(
            _fixture.Db,
            Options.Create(AntiSpam),
            NullLogger<EstimateRequestService>.Instance);
    }

    public void Dispose() => _fixture.Dispose();

    private static CreateEstimateRequestDto ValidRequest() => new()
    {
        FirstName = "  Dana  ",
        LastName = "  Okonkwo ",
        Email = " dana@example.com ",
        Phone = "(555) 010-2233",
        ProjectTypeSlugs = ["kitchen-remodeling", "flooring"],
        PropertyType = PropertyType.SingleFamily,
        AddressLine = "12 Maple Street",
        City = "Example City",
        PostalCode = "12345",
        Timeline = ProjectTimeline.OneToThreeMonths,
        BudgetRange = BudgetRange.From15kTo35k,
        Description = "Our kitchen is from the eighties and the layout does not work for two people cooking at once.",
        PreferredContactMethod = PreferredContactMethod.Email,
        ReferralSource = "Search",
        ElapsedMs = 45_000,
    };

    /* ------------------------------------------------------ persistence */

    [Fact]
    public async Task Submitting_a_valid_request_persists_it_with_a_reference()
    {
        var result = await _service.SubmitAsync(ValidRequest(), "203.0.113.7", "TestAgent/1.0");

        Assert.Equal(SubmissionOutcome.Accepted, result.Outcome);
        Assert.NotNull(result.Result);
        Assert.StartsWith("KSC-", result.Result.Reference);

        var saved = await _fixture.Db.EstimateRequests.SingleAsync();
        Assert.Equal(result.Result.Reference, saved.Reference);
        Assert.Equal(EstimateRequestStatus.New, saved.Status);
        Assert.NotEqual(default, saved.CreatedAtUtc);
    }

    [Fact]
    public async Task Submitted_values_are_trimmed()
    {
        await _service.SubmitAsync(ValidRequest(), "203.0.113.7", null);

        var saved = await _fixture.Db.EstimateRequests.SingleAsync();
        Assert.Equal("Dana", saved.FirstName);
        Assert.Equal("Okonkwo", saved.LastName);
        Assert.Equal("dana@example.com", saved.Email);
    }

    [Fact]
    public async Task Duplicate_project_types_are_collapsed()
    {
        var dto = ValidRequest();
        dto.ProjectTypeSlugs = ["flooring", "flooring", "  flooring  ", "kitchen-remodeling"];

        await _service.SubmitAsync(dto, "203.0.113.7", null);

        var saved = await _fixture.Db.EstimateRequests.SingleAsync();
        Assert.Equal(2, saved.ProjectTypeSlugs.Count);
    }

    [Fact]
    public async Task References_are_unique_across_submissions()
    {
        var references = new HashSet<string>();

        for (var i = 0; i < 10; i++)
        {
            var result = await _service.SubmitAsync(ValidRequest(), null, null);
            Assert.NotNull(result.Result);
            Assert.True(references.Add(result.Result.Reference), "A duplicate reference was issued.");
        }
    }

    [Fact]
    public async Task The_raw_ip_address_is_never_stored()
    {
        const string ip = "203.0.113.42";
        await _service.SubmitAsync(ValidRequest(), ip, null);

        var saved = await _fixture.Db.EstimateRequests.SingleAsync();
        Assert.NotNull(saved.SubmitterIpHash);
        Assert.DoesNotContain(ip, saved.SubmitterIpHash);
        Assert.Equal(64, saved.SubmitterIpHash.Length);
    }

    [Fact]
    public async Task A_missing_ip_address_is_tolerated()
    {
        var result = await _service.SubmitAsync(ValidRequest(), null, null);

        Assert.Equal(SubmissionOutcome.Accepted, result.Outcome);
        var saved = await _fixture.Db.EstimateRequests.SingleAsync();
        Assert.Null(saved.SubmitterIpHash);
    }

    [Fact]
    public async Task A_long_user_agent_is_truncated_rather_than_rejected()
    {
        await _service.SubmitAsync(
            ValidRequest(),
            "203.0.113.7",
            new string('x', 900),
            CancellationToken.None);

        var saved = await _fixture.Db.EstimateRequests.SingleAsync();
        Assert.NotNull(saved.UserAgent);
        Assert.Equal(300, saved.UserAgent.Length);
    }

    /* --------------------------------------------------------- spam ---- */

    [Fact]
    public async Task A_filled_honeypot_is_rejected_and_nothing_is_stored()
    {
        var dto = ValidRequest();
        dto.CompanyWebsite = "https://spam.example.com";

        var result = await _service.SubmitAsync(dto, "203.0.113.7", null);

        Assert.Equal(SubmissionOutcome.RejectedAsAutomated, result.Outcome);
        Assert.Empty(await _fixture.Db.EstimateRequests.ToListAsync());
    }

    [Fact]
    public async Task A_rejected_bot_still_receives_a_success_shaped_response()
    {
        var dto = ValidRequest();
        dto.CompanyWebsite = "https://spam.example.com";

        var result = await _service.SubmitAsync(dto, "203.0.113.7", null);

        // Telling a bot it was detected just teaches it which check to defeat.
        Assert.NotNull(result.Result);
        Assert.StartsWith("KSC-", result.Result.Reference);
    }

    [Fact]
    public async Task A_submission_completed_impossibly_fast_is_rejected()
    {
        var dto = ValidRequest();
        dto.ElapsedMs = 120;

        var result = await _service.SubmitAsync(dto, "203.0.113.7", null);

        Assert.Equal(SubmissionOutcome.RejectedAsAutomated, result.Outcome);
        Assert.Empty(await _fixture.Db.EstimateRequests.ToListAsync());
    }

    [Fact]
    public async Task A_zero_elapsed_time_is_accepted_so_no_script_clients_still_work()
    {
        var dto = ValidRequest();
        dto.ElapsedMs = 0;

        var result = await _service.SubmitAsync(dto, "203.0.113.7", null);

        Assert.Equal(SubmissionOutcome.Accepted, result.Outcome);
    }

    [Fact]
    public async Task Repeated_submissions_from_one_source_are_throttled()
    {
        for (var i = 0; i < AntiSpam.MaxSubmissionsPerWindow; i++)
        {
            var accepted = await _service.SubmitAsync(ValidRequest(), "198.51.100.9", null);
            Assert.Equal(SubmissionOutcome.Accepted, accepted.Outcome);
        }

        var throttled = await _service.SubmitAsync(ValidRequest(), "198.51.100.9", null);

        Assert.Equal(SubmissionOutcome.RateLimited, throttled.Outcome);
        Assert.Null(throttled.Result);
    }

    [Fact]
    public async Task Throttling_is_scoped_to_the_source_address()
    {
        for (var i = 0; i < AntiSpam.MaxSubmissionsPerWindow; i++)
        {
            await _service.SubmitAsync(ValidRequest(), "198.51.100.9", null);
        }

        var other = await _service.SubmitAsync(ValidRequest(), "198.51.100.10", null);

        Assert.Equal(SubmissionOutcome.Accepted, other.Outcome);
    }

    /* ---------------------------------------------------------- admin -- */

    [Fact]
    public async Task Listing_pages_and_orders_newest_first()
    {
        for (var i = 0; i < 5; i++)
        {
            await _service.SubmitAsync(ValidRequest(), $"203.0.113.{i}", null);
        }

        var page = await _service.ListAsync(null, null, 1, 2);

        Assert.Equal(2, page.Items.Count);
        Assert.Equal(5, page.TotalCount);
        Assert.Equal(3, page.TotalPages);
        Assert.True(page.Items[0].CreatedAtUtc >= page.Items[1].CreatedAtUtc);
    }

    [Fact]
    public async Task Listing_clamps_an_absurd_page_size()
    {
        await _service.SubmitAsync(ValidRequest(), "203.0.113.7", null);

        var page = await _service.ListAsync(null, null, 0, 5000);

        Assert.Equal(1, page.Page);
        Assert.Equal(100, page.PageSize);
    }

    [Fact]
    public async Task Listing_filters_by_status()
    {
        var first = await _service.SubmitAsync(ValidRequest(), "203.0.113.1", null);
        await _service.SubmitAsync(ValidRequest(), "203.0.113.2", null);

        var target = await _fixture.Db.EstimateRequests
            .SingleAsync(r => r.Reference == first.Result!.Reference);
        await _service.UpdateAsync(
            target.Id,
            new UpdateEstimateRequestDto { Status = EstimateRequestStatus.Won },
            CancellationToken.None);

        var won = await _service.ListAsync(EstimateRequestStatus.Won, null, 1, 20);

        Assert.Single(won.Items);
        Assert.Equal(EstimateRequestStatus.Won, won.Items[0].Status);
    }

    [Fact]
    public async Task Listing_searches_by_reference_and_email()
    {
        var created = await _service.SubmitAsync(ValidRequest(), "203.0.113.7", null);

        var byReference = await _service.ListAsync(null, created.Result!.Reference, 1, 20);
        var byEmail = await _service.ListAsync(null, "dana@example.com", 1, 20);

        Assert.Single(byReference.Items);
        Assert.Single(byEmail.Items);
    }

    [Fact]
    public async Task Updating_sets_status_notes_and_the_updated_timestamp()
    {
        await _service.SubmitAsync(ValidRequest(), "203.0.113.7", null);
        var saved = await _fixture.Db.EstimateRequests.SingleAsync();

        var updated = await _service.UpdateAsync(
            saved.Id,
            new UpdateEstimateRequestDto
            {
                Status = EstimateRequestStatus.Contacted,
                InternalNotes = "Called and left a message.",
            },
            CancellationToken.None);

        Assert.NotNull(updated);
        Assert.Equal(EstimateRequestStatus.Contacted, updated.Status);
        Assert.Equal("Called and left a message.", updated.InternalNotes);
        Assert.NotNull(updated.UpdatedAtUtc);
    }

    [Fact]
    public async Task Updating_an_unknown_id_returns_null_rather_than_throwing()
    {
        var updated = await _service.UpdateAsync(
            9999,
            new UpdateEstimateRequestDto { Status = EstimateRequestStatus.Lost },
            CancellationToken.None);

        Assert.Null(updated);
    }

    /* ----------------------------------------------------- dto validation */

    private static List<ValidationResult> Validate(CreateEstimateRequestDto dto)
    {
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(dto, new ValidationContext(dto), results, validateAllProperties: true);
        return results;
    }

    [Fact]
    public void A_well_formed_request_passes_validation()
    {
        Assert.Empty(Validate(ValidRequest()));
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-an-email")]
    [InlineData("missing@domain")]
    public void An_invalid_email_fails_validation(string email)
    {
        var dto = ValidRequest();
        dto.Email = email;

        Assert.Contains(Validate(dto), r => r.MemberNames.Contains(nameof(dto.Email)));
    }

    [Theory]
    [InlineData("")]
    [InlineData("!!")]
    [InlineData("this-postal-code-is-far-too-long")]
    public void An_invalid_postal_code_fails_validation(string postalCode)
    {
        var dto = ValidRequest();
        dto.PostalCode = postalCode;

        Assert.Contains(Validate(dto), r => r.MemberNames.Contains(nameof(dto.PostalCode)));
    }

    [Fact]
    public void A_too_short_description_fails_validation()
    {
        var dto = ValidRequest();
        dto.Description = "help";

        Assert.Contains(Validate(dto), r => r.MemberNames.Contains(nameof(dto.Description)));
    }

    [Fact]
    public void An_over_long_description_fails_validation()
    {
        var dto = ValidRequest();
        dto.Description = new string('x', 4001);

        Assert.Contains(Validate(dto), r => r.MemberNames.Contains(nameof(dto.Description)));
    }

    [Fact]
    public void An_over_long_name_fails_validation()
    {
        var dto = ValidRequest();
        dto.FirstName = new string('x', 81);

        Assert.Contains(Validate(dto), r => r.MemberNames.Contains(nameof(dto.FirstName)));
    }

    [Fact]
    public void A_malformed_phone_number_fails_validation()
    {
        var dto = ValidRequest();
        dto.Phone = "call me maybe";

        Assert.Contains(Validate(dto), r => r.MemberNames.Contains(nameof(dto.Phone)));
    }

    [Fact]
    public void An_omitted_phone_number_is_allowed()
    {
        var dto = ValidRequest();
        dto.Phone = null;

        Assert.DoesNotContain(Validate(dto), r => r.MemberNames.Contains(nameof(dto.Phone)));
    }

    [Fact]
    public void An_out_of_range_enum_fails_validation()
    {
        var dto = ValidRequest();
        dto.PropertyType = (PropertyType)99;

        Assert.Contains(Validate(dto), r => r.MemberNames.Contains(nameof(dto.PropertyType)));
    }

    [Fact]
    public void An_unbounded_project_type_list_fails_validation()
    {
        var dto = ValidRequest();
        dto.ProjectTypeSlugs = Enumerable.Range(0, 50).Select(i => $"slug-{i}").ToList();

        Assert.Contains(Validate(dto), r => r.MemberNames.Contains(nameof(dto.ProjectTypeSlugs)));
    }
}
