using KellumsSecondChance.Server.Domain.Entities;
using KellumsSecondChance.Server.Domain.Enums;
using KellumsSecondChance.Server.Dtos;
using KellumsSecondChance.Server.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace KellumsSecondChance.Server.Tests;

/// <summary>
/// The dashboard.
///
/// Its job is to answer "why isn't my work showing on the website?" without the
/// owner having to know how any of this is built. These tests check that each
/// blocking condition is actually surfaced — and that nothing is reported that
/// the application does not genuinely know.
/// </summary>
public class AdminDashboardServiceTests : IDisposable
{
    private readonly TestDatabase _fixture = new();
    private readonly AdminDashboardService _dashboard;

    public AdminDashboardServiceTests()
    {
        var settings = new SiteSettingsWriteService(
            _fixture.Db,
            new FakeContentVersion(),
            TestEnvironment.Development,
            NullLogger<SiteSettingsWriteService>.Instance);

        _dashboard = new AdminDashboardService(_fixture.Db, settings);
    }

    public void Dispose() => _fixture.Dispose();

    private async Task<RenovationProject> AddProjectAsync(
        bool isActive = true,
        bool withCover = false,
        bool withPair = false,
        string slug = "maple-street-kitchen")
    {
        var project = new RenovationProject
        {
            Slug = slug,
            Title = "Maple Street Kitchen",
            CategoryName = "Kitchen Remodeling",
            CategorySlug = "kitchen-remodeling",
            Summary = "A tired galley kitchen opened into the dining room.",
            Challenge = "The layout was wrong.",
            Vision = "One continuous run.",
            Transformation = "We rebuilt it.",
            IsActive = isActive,
        };

        if (withCover) project.Images.Add(Image(ProjectImageKind.Cover));
        if (withPair)
        {
            project.Images.Add(Image(ProjectImageKind.Before));
            project.Images.Add(Image(ProjectImageKind.After));
        }

        _fixture.Db.RenovationProjects.Add(project);
        await _fixture.Db.SaveChangesAsync();
        _fixture.Db.ChangeTracker.Clear();
        return project;
    }

    private static RenovationProjectImage Image(ProjectImageKind kind) => new()
    {
        Path = $"/media/{kind}.png",
        AltText = kind.ToString(),
        Width = 1200,
        Height = 800,
        Kind = kind,
    };

    private async Task AddLeadAsync(EstimateRequestStatus status, string reference)
    {
        _fixture.Db.EstimateRequests.Add(new EstimateRequest
        {
            Reference = reference,
            FirstName = "Dana",
            LastName = "Okonkwo",
            Email = "dana@example.com",
            PostalCode = "12345",
            Description = "Our kitchen needs work.",
            ProjectTypeSlugs = ["kitchen-remodeling"],
            Status = status,
            CreatedAtUtc = DateTime.UtcNow,
        });
        await _fixture.Db.SaveChangesAsync();
        _fixture.Db.ChangeTracker.Clear();
    }

    private static AttentionItemDto? Find(DashboardDto dashboard, string kind, string contains) =>
        dashboard.NeedsAttention.FirstOrDefault(i =>
            i.Kind == kind && i.Title.Contains(contains, StringComparison.OrdinalIgnoreCase));

    /* ==================================================================== */
    /*  Counts                                                              */
    /* ==================================================================== */

    [Fact]
    public async Task An_empty_database_reports_zeroes_rather_than_guesses()
    {
        var result = await _dashboard.GetAsync();

        Assert.Equal(0, result.Metrics.TotalLeads);
        Assert.Equal(0, result.Metrics.PublishedProjects);
        Assert.Empty(result.RecentRequests);
    }

    [Fact]
    public async Task Leads_are_counted_into_their_pipeline_stages()
    {
        await AddLeadAsync(EstimateRequestStatus.New, "KSC-AAAA1");
        await AddLeadAsync(EstimateRequestStatus.New, "KSC-AAAA2");
        await AddLeadAsync(EstimateRequestStatus.Contacted, "KSC-AAAA3");
        await AddLeadAsync(EstimateRequestStatus.Won, "KSC-AAAA4");

        var result = await _dashboard.GetAsync();

        Assert.Equal(2, result.Metrics.NewLeads);
        Assert.Equal(1, result.Metrics.AwaitingFollowUp);
        Assert.Equal(1, result.Metrics.Won);
        Assert.Equal(4, result.Metrics.TotalLeads);
        Assert.Equal(4, result.Metrics.LeadsLast30Days);
    }

    [Fact]
    public async Task Drafts_and_published_projects_are_counted_separately()
    {
        await AddProjectAsync(isActive: true, withCover: true, withPair: true, slug: "live-one");
        await AddProjectAsync(isActive: false, slug: "draft-one");

        var result = await _dashboard.GetAsync();

        Assert.Equal(1, result.Metrics.PublishedProjects);
        Assert.Equal(1, result.Metrics.DraftProjects);
    }

    /* ==================================================================== */
    /*  Needs attention                                                     */
    /* ==================================================================== */

    [Fact]
    public async Task Uncontacted_leads_are_the_most_urgent_thing_on_the_board()
    {
        await AddLeadAsync(EstimateRequestStatus.New, "KSC-AAAA1");

        var result = await _dashboard.GetAsync();

        var item = Find(result, "leads", "not been contacted");
        Assert.NotNull(item);
        Assert.Equal("urgent", item.Severity);
        // The link has to land on the filtered list, not a general page.
        Assert.Contains("status=New", item.ActionPath);
    }

    [Fact]
    public async Task A_published_project_with_no_cover_photo_is_flagged()
    {
        await AddProjectAsync(isActive: true, withCover: false, withPair: true);

        var result = await _dashboard.GetAsync();

        var item = Find(result, "project", "no cover photo");
        Assert.NotNull(item);

        // The exact path the console routes. "/admin/projects/{id}/edit" looks
        // plausible and is not a route — it would land the owner on a
        // "not found" from a link that says "Fix this".
        var project = await _fixture.Db.RenovationProjects.SingleAsync();
        Assert.Equal($"/admin/projects/{project.Id}", item.ActionPath);
    }

    [Fact]
    public async Task A_published_project_with_no_transformation_pair_is_flagged()
    {
        await AddProjectAsync(isActive: true, withCover: true, withPair: false);

        var result = await _dashboard.GetAsync();

        Assert.NotNull(Find(result, "project", "before/after"));
    }

    [Fact]
    public async Task A_complete_published_project_raises_nothing()
    {
        await AddProjectAsync(isActive: true, withCover: true, withPair: true);

        var result = await _dashboard.GetAsync();

        Assert.Null(Find(result, "project", "no cover photo"));
        Assert.Null(Find(result, "project", "before/after"));
    }

    [Fact]
    public async Task A_question_awaiting_a_business_decision_is_surfaced()
    {
        _fixture.Db.FaqItems.Add(new FaqItem
        {
            Question = "Do you charge for an estimate?",
            Answer = string.Empty,
            Category = "Getting started",
            CategorySlug = "getting-started",
            NeedsReview = true,
            ReviewNote = "Confirm whether estimates are free.",
            IsActive = true,
        });
        await _fixture.Db.SaveChangesAsync();
        _fixture.Db.ChangeTracker.Clear();

        var result = await _dashboard.GetAsync();

        var item = Find(result, "faq", "business decision");
        Assert.NotNull(item);
        // The detail line carries the actual question so it can be recognised.
        Assert.Equal("Do you charge for an estimate?", item.Detail);
        Assert.Equal(1, result.Metrics.FaqsAwaitingReview);
        // A held-back question is not counted as published.
        Assert.Equal(0, result.Metrics.PublishedFaqs);
    }

    [Fact]
    public async Task Placeholder_service_areas_are_reported_while_they_remain()
    {
        await _fixture.SeedSampleContentAsync();

        var result = await _dashboard.GetAsync();

        Assert.NotNull(Find(result, "service-area", "stand-in"));
    }

    [Fact]
    public async Task A_missing_phone_number_is_reported_as_urgent()
    {
        var result = await _dashboard.GetAsync();

        var item = Find(result, "settings", "No phone number");
        Assert.NotNull(item);
        Assert.Equal("urgent", item.Severity);
        Assert.Equal("/admin/site-settings", item.ActionPath);
    }

    [Fact]
    public async Task Filling_in_the_business_details_clears_their_warnings()
    {
        var settings = new SiteSettingsWriteService(
            _fixture.Db,
            new FakeContentVersion(),
            TestEnvironment.Development,
            NullLogger<SiteSettingsWriteService>.Instance);

        await settings.SaveAsync(new SiteSettingsWriteDto
        {
            PhoneDisplay = "(513) 620-0130",
            PhoneE164 = "+15136200130",
            Email = "hello@example.com",
            SiteUrl = "https://www.example.com",
            OgImagePath = "/brand/card.png",
        });

        var result = await _dashboard.GetAsync();

        Assert.Null(Find(result, "settings", "No phone number"));
        Assert.Null(Find(result, "settings", "No email"));
        Assert.Null(Find(result, "settings", "website address"));
        Assert.Null(Find(result, "settings", "sharing image"));
    }

    [Fact]
    public async Task An_unpublished_real_review_is_flagged_but_an_unpublished_example_is_not()
    {
        _fixture.Db.CustomerTestimonials.AddRange(
            new CustomerTestimonial
            {
                FirstName = "Dana",
                Quote = "They did the work properly.",
                Rating = 5,
                IsActive = false,
                IsSampleContent = false,
            },
            new CustomerTestimonial
            {
                FirstName = "Example",
                Quote = "An illustration of the kind of review a customer might leave.",
                Rating = 5,
                IsActive = false,
                IsSampleContent = true,
            });
        await _fixture.Db.SaveChangesAsync();
        _fixture.Db.ChangeTracker.Clear();

        var result = await _dashboard.GetAsync();

        var item = Find(result, "testimonial", "not published");
        Assert.NotNull(item);
        // One real review, not two — nudging somebody to publish a written
        // example as a customer quote would be the worst possible prompt.
        Assert.StartsWith("1 review", item.Title);
    }

    [Fact]
    public async Task The_dashboard_reports_no_figure_it_cannot_derive()
    {
        /*
         * A guard against the obvious future temptation. This application never
         * records what a job was worth, so a revenue or conversion tile would be
         * an invention. If one is ever added, the DTO gains a property and this
         * test fails on purpose.
         */
        var properties = typeof(DashboardMetricsDto)
            .GetProperties()
            .Select(p => p.Name)
            .ToList();

        Assert.DoesNotContain(properties, name =>
            name.Contains("Revenue", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Value", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Conversion", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task The_recent_list_shows_the_newest_leads_first()
    {
        await AddLeadAsync(EstimateRequestStatus.New, "KSC-OLDER");
        await Task.Delay(10);
        await AddLeadAsync(EstimateRequestStatus.New, "KSC-NEWER");

        var result = await _dashboard.GetAsync();

        Assert.Equal(2, result.RecentRequests.Count);
        Assert.True(
            result.RecentRequests[0].CreatedAtUtc >= result.RecentRequests[1].CreatedAtUtc);
    }
}
