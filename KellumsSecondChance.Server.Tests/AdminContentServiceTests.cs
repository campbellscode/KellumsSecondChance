using KellumsSecondChance.Server.Domain.Entities;
using KellumsSecondChance.Server.Domain.Enums;
using KellumsSecondChance.Server.Dtos;
using KellumsSecondChance.Server.Infrastructure.Media;
using KellumsSecondChance.Server.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace KellumsSecondChance.Server.Tests;

/// <summary>
/// Storage stub. Records what it was asked to delete so the orphan-only rule
/// can be asserted without touching the filesystem.
/// </summary>
internal sealed class FakeMediaStorage : IMediaStorage
{
    public List<string> Saved { get; } = [];
    public List<string> Deleted { get; } = [];

    private int _counter;

    public Task<StoredMedia> SaveAsync(
        MediaScope scope,
        byte[] content,
        string extension,
        CancellationToken ct = default)
    {
        var key = $"{scope.Folder}/file{++_counter}{extension}";
        Saved.Add(key);
        return Task.FromResult(new StoredMedia(key, "/uploads/" + key, content.LongLength));
    }

    public Task<bool> DeleteAsync(string storageKey, CancellationToken ct = default)
    {
        Deleted.Add(storageKey);
        return Task.FromResult(true);
    }

    public string ToPublicPath(string storageKey) => "/uploads/" + storageKey;
}

/// <summary>Counts bumps so cache-invalidation can be asserted.</summary>
internal sealed class FakeContentVersion : IContentVersion
{
    public int Bumps { get; private set; }

    public string Current => $"\"test-{Bumps}\"";

    public void Bump() => Bumps++;
}

public class AdminContentServiceTests : IDisposable
{
    private readonly TestDatabase _fixture = new();
    private readonly FakeMediaStorage _storage = new();
    private readonly FakeContentVersion _version = new();
    private readonly AdminContentService _service;

    public AdminContentServiceTests()
    {
        _service = new AdminContentService(
            _fixture.Db,
            _storage,
            _version,
            NullLogger<AdminContentService>.Instance);
    }

    public void Dispose() => _fixture.Dispose();

    private static ProjectWriteDto ValidProject(string title = "Maple Street Kitchen") => new()
    {
        Title = title,
        CategoryName = "Kitchen Remodeling",
        CategorySlug = "kitchen-remodeling",
        Location = "Example City",
        Summary = "A tired galley kitchen opened into the dining room.",
        Challenge = "The layout forced two people into the same three feet of floor.",
        Vision = "One continuous run of worktop, and a way through to the dining room.",
        Transformation = "We took out the partition, moved the sink and rebuilt the run.",
        Highlights = ["Reclaimed oak worktops"],
        IsActive = true,
        DisplayOrder = 1,
    };

    /* ==================================================================== */
    /*  Projects                                                            */
    /* ==================================================================== */

    [Fact]
    public async Task Creating_a_project_derives_the_address_from_the_title()
    {
        var result = await _service.CreateProjectAsync(ValidProject());

        Assert.True(result.Ok);
        Assert.Equal("maple-street-kitchen", result.Value!.Slug);
        Assert.Equal(1, _version.Bumps);
    }

    [Fact]
    public async Task A_project_created_in_the_console_is_never_marked_as_an_example()
    {
        // IsSampleContent drives the "this is a demonstration" label and the
        // exclusion from search-engine markup. A real job must never carry it,
        // and the write DTO deliberately has no way to set it.
        var result = await _service.CreateProjectAsync(ValidProject());

        Assert.False(result.Value!.IsSampleContent);
    }

    [Fact]
    public async Task Two_projects_cannot_share_an_address()
    {
        await _service.CreateProjectAsync(ValidProject());
        var second = await _service.CreateProjectAsync(ValidProject());

        Assert.False(second.Ok);
        Assert.Equal(WriteFailure.Validation, second.Failure);
        Assert.Equal(nameof(ProjectWriteDto.Slug), second.Field);
    }

    [Fact]
    public async Task Renaming_a_project_does_not_move_its_published_address()
    {
        var created = await _service.CreateProjectAsync(ValidProject());

        var renamed = ValidProject("A completely different heading");
        renamed.RowVersion = created.Value!.RowVersion;
        var updated = await _service.UpdateProjectAsync(created.Value.Id, renamed);

        Assert.True(updated.Ok);
        Assert.Equal("A completely different heading", updated.Value!.Title);
        // The URL customers may have shared stays where it was.
        Assert.Equal("maple-street-kitchen", updated.Value.Slug);
    }

    [Fact]
    public async Task An_address_only_changes_when_it_is_explicitly_supplied()
    {
        var created = await _service.CreateProjectAsync(ValidProject());

        var dto = ValidProject();
        dto.Slug = "a-deliberate-new-address";
        var updated = await _service.UpdateProjectAsync(created.Value!.Id, dto);

        Assert.True(updated.Ok);
        Assert.Equal("a-deliberate-new-address", updated.Value!.Slug);
    }

    [Fact]
    public async Task A_stale_concurrency_token_is_reported_as_a_conflict()
    {
        var created = await _service.CreateProjectAsync(ValidProject());
        var id = created.Value!.Id;
        _fixture.Db.ChangeTracker.Clear();

        /*
         * SQL Server maintains `rowversion` itself. SQLite has no equivalent, so
         * this test plays the part of the database and stamps a new value — the
         * same thing that happens when somebody else saves first.
         *
         * What is under test is the application's response to a token that no
         * longer matches the stored row, which is identical on either provider.
         */
        await _fixture.Db.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE RenovationProjects SET RowVersion = X'AABBCCDD' WHERE Id = {id}");

        var ours = ValidProject("Our version");
        // The value we were holding from before their save.
        ours.RowVersion = Convert.ToBase64String(new byte[] { 0x01, 0x02, 0x03, 0x04 });

        var result = await _service.UpdateProjectAsync(id, ours);

        Assert.False(result.Ok);
        Assert.Equal(WriteFailure.Conflict, result.Failure);
        Assert.Contains("Somebody else", result.Message);
    }

    [Fact]
    public async Task A_malformed_concurrency_token_is_refused_rather_than_ignored()
    {
        var created = await _service.CreateProjectAsync(ValidProject());
        _fixture.Db.ChangeTracker.Clear();

        var dto = ValidProject();
        dto.RowVersion = "this is not base64!!";

        var result = await _service.UpdateProjectAsync(created.Value!.Id, dto);

        // Silently dropping an unreadable token would turn a safety check into
        // a no-op, which is worse than refusing the save.
        Assert.False(result.Ok);
        Assert.Equal(WriteFailure.Conflict, result.Failure);
    }

    [Fact]
    public async Task An_update_with_no_token_saves_normally()
    {
        // The token is optional: a screen that does not track it still works,
        // it simply gives up last-writer detection.
        var created = await _service.CreateProjectAsync(ValidProject());
        _fixture.Db.ChangeTracker.Clear();

        var dto = ValidProject("Retitled");
        dto.RowVersion = null;

        var result = await _service.UpdateProjectAsync(created.Value!.Id, dto);

        Assert.True(result.Ok);
        Assert.Equal("Retitled", result.Value!.Title);
    }

    [Fact]
    public async Task A_switched_off_service_cannot_be_newly_attached_to_a_project()
    {
        var service = new RenovationService
        {
            Slug = "retired-service",
            Name = "Retired Service",
            Tagline = "No longer offered",
            Summary = "This service is switched off.",
            Icon = "hammer",
            Headline = "Retired",
            Introduction = "Kept for history only.",
            IsActive = false,
        };
        _fixture.Db.RenovationServices.Add(service);
        await _fixture.Db.SaveChangesAsync();

        var dto = ValidProject();
        dto.ServiceIds = [service.Id];
        var result = await _service.CreateProjectAsync(dto);

        Assert.False(result.Ok);
        Assert.Equal(WriteFailure.Validation, result.Failure);
        Assert.Contains("switched off", result.Message);
    }

    [Fact]
    public async Task An_already_attached_service_survives_being_switched_off()
    {
        var service = new RenovationService
        {
            Slug = "kitchen-remodeling",
            Name = "Kitchen Remodeling",
            Tagline = "Kitchens",
            Summary = "Full kitchen renovation.",
            Icon = "chef-hat",
            Headline = "Kitchens",
            Introduction = "We renovate kitchens.",
            IsActive = true,
        };
        _fixture.Db.RenovationServices.Add(service);
        await _fixture.Db.SaveChangesAsync();

        var dto = ValidProject();
        dto.ServiceIds = [service.Id];
        var created = await _service.CreateProjectAsync(dto);
        Assert.True(created.Ok);

        service.IsActive = false;
        await _fixture.Db.SaveChangesAsync();
        _fixture.Db.ChangeTracker.Clear();

        // Editing an old project must not become impossible because a service
        // was retired years later.
        var again = ValidProject();
        again.ServiceIds = [service.Id];
        var updated = await _service.UpdateProjectAsync(created.Value!.Id, again);

        Assert.True(updated.Ok);
        Assert.Contains(service.Id, updated.Value!.ServiceIds);
    }

    [Fact]
    public async Task Deleting_a_project_removes_only_files_nothing_else_references()
    {
        var created = await _service.CreateProjectAsync(ValidProject());
        var id = created.Value!.Id;

        var other = await _service.CreateProjectAsync(ValidProject("Second Project"));

        _fixture.Db.RenovationProjectImages.AddRange(
            new RenovationProjectImage
            {
                RenovationProjectId = id,
                Path = "/uploads/only-here.png",
                StorageKey = "projects/1/only-here.png",
                AltText = "Only used once",
                Width = 100,
                Height = 100,
                Kind = ProjectImageKind.Gallery,
            },
            new RenovationProjectImage
            {
                RenovationProjectId = id,
                Path = "/uploads/shared.png",
                StorageKey = "projects/1/shared.png",
                AltText = "Shared",
                Width = 100,
                Height = 100,
                Kind = ProjectImageKind.Gallery,
            },
            new RenovationProjectImage
            {
                RenovationProjectId = other.Value!.Id,
                Path = "/uploads/shared.png",
                StorageKey = "projects/1/shared.png",
                AltText = "Shared elsewhere",
                Width = 100,
                Height = 100,
                Kind = ProjectImageKind.Gallery,
            });
        await _fixture.Db.SaveChangesAsync();
        _fixture.Db.ChangeTracker.Clear();

        var result = await _service.DeleteProjectAsync(id);

        Assert.True(result.Ok);
        Assert.Contains("projects/1/only-here.png", _storage.Deleted);
        // Still referenced by the other project, so the file stays put.
        Assert.DoesNotContain("projects/1/shared.png", _storage.Deleted);
    }

    [Fact]
    public async Task The_project_list_flags_what_is_stopping_a_project_going_live()
    {
        var created = await _service.CreateProjectAsync(ValidProject());
        var id = created.Value!.Id;

        var list = await _service.ListProjectsAsync();
        var row = Assert.Single(list);

        Assert.False(row.HasCoverImage);
        Assert.False(row.HasBeforeAfter);

        _fixture.Db.RenovationProjectImages.AddRange(
            NewImage(id, ProjectImageKind.Cover),
            NewImage(id, ProjectImageKind.Before),
            NewImage(id, ProjectImageKind.After));
        await _fixture.Db.SaveChangesAsync();
        _fixture.Db.ChangeTracker.Clear();

        row = Assert.Single(await _service.ListProjectsAsync());
        Assert.True(row.HasCoverImage);
        Assert.True(row.HasBeforeAfter);
        Assert.Equal(3, row.ImageCount);
    }

    private static RenovationProjectImage NewImage(int projectId, ProjectImageKind kind) => new()
    {
        RenovationProjectId = projectId,
        Path = $"/uploads/{kind}.png",
        AltText = kind.ToString(),
        Width = 100,
        Height = 100,
        Kind = kind,
    };

    /* ---------------------------------------------------- publish state -- */

    /// <summary>
    /// The public reader, so publishing can be asserted from the outside rather
    /// than by trusting a boolean on a DTO.
    /// </summary>
    private ContentService PublicContent() => new(_fixture.Db);

    [Fact]
    public async Task A_draft_project_is_withheld_from_the_public_site()
    {
        var dto = ValidProject();
        dto.IsActive = false;
        var created = await _service.CreateProjectAsync(dto);

        Assert.True(created.Ok);
        Assert.False(created.Value!.IsActive);
        _fixture.Db.ChangeTracker.Clear();

        // Not in the gallery, and its own page does not resolve.
        Assert.Empty(await PublicContent().GetProjectsAsync(null, false, null, null));
        Assert.Null(await PublicContent().GetProjectAsync(created.Value.Slug));

        // But the console can see it, because that is where drafts live.
        Assert.Single(await _service.ListProjectsAsync());
    }

    [Fact]
    public async Task Publishing_a_draft_puts_it_on_the_website()
    {
        var dto = ValidProject();
        dto.IsActive = false;
        var created = await _service.CreateProjectAsync(dto);
        _fixture.Db.ChangeTracker.Clear();

        var published = ValidProject();
        published.IsActive = true;
        var result = await _service.UpdateProjectAsync(created.Value!.Id, published);

        Assert.True(result.Ok);
        _fixture.Db.ChangeTracker.Clear();

        Assert.Single(await PublicContent().GetProjectsAsync(null, false, null, null));
        Assert.NotNull(await PublicContent().GetProjectAsync(created.Value.Slug));
    }

    [Fact]
    public async Task Unpublishing_takes_a_project_straight_back_off_the_website()
    {
        var created = await _service.CreateProjectAsync(ValidProject());
        _fixture.Db.ChangeTracker.Clear();
        Assert.Single(await PublicContent().GetProjectsAsync(null, false, null, null));

        var withdrawn = ValidProject();
        withdrawn.IsActive = false;
        await _service.UpdateProjectAsync(created.Value!.Id, withdrawn);
        _fixture.Db.ChangeTracker.Clear();

        Assert.Empty(await PublicContent().GetProjectsAsync(null, false, null, null));
        // Nothing was destroyed — unpublishing is not deleting.
        Assert.Single(await _service.ListProjectsAsync());
    }

    [Fact]
    public async Task A_withheld_question_never_reaches_the_public_faq()
    {
        await _service.CreateFaqAsync(ValidFaq());
        _fixture.Db.ChangeTracker.Clear();

        var published = await PublicContent().GetFaqsAsync(includePendingReview: false);
        var everything = await PublicContent().GetFaqsAsync(includePendingReview: true);

        Assert.Empty(published);
        Assert.Single(everything);
    }

    /* ==================================================================== */
    /*  Services                                                            */
    /* ==================================================================== */

    private static ServiceWriteDto ValidService(string name = "Bathroom Renovation") => new()
    {
        Name = name,
        Tagline = "Bathrooms rebuilt properly",
        Summary = "A full bathroom renovation from strip-out to final seal.",
        Icon = "shower-head",
        Headline = "Bathrooms that last",
        Introduction = "We rebuild bathrooms from the substrate up.",
        Includes = ["Strip-out and disposal"],
        IsActive = true,
    };

    [Fact]
    public async Task A_service_still_used_by_a_project_cannot_be_deleted()
    {
        var service = await _service.CreateServiceAsync(ValidService());

        var projectDto = ValidProject();
        projectDto.ServiceIds = [service.Value!.Id];
        await _service.CreateProjectAsync(projectDto);
        _fixture.Db.ChangeTracker.Clear();

        var result = await _service.DeleteServiceAsync(service.Value.Id);

        Assert.False(result.Ok);
        // A conflict, not a validation failure: the request was well-formed, the
        // current state is what makes it impossible.
        Assert.Equal(WriteFailure.Conflict, result.Failure);
        // The refusal has to tell the owner what to do instead.
        Assert.Contains("switch", result.Message!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task An_unused_service_can_be_deleted()
    {
        var service = await _service.CreateServiceAsync(ValidService());

        var result = await _service.DeleteServiceAsync(service.Value!.Id);

        Assert.True(result.Ok);
        Assert.Empty(await _fixture.Db.RenovationServices.ToListAsync());
    }

    [Fact]
    public async Task The_service_list_reports_how_many_projects_depend_on_each_one()
    {
        var service = await _service.CreateServiceAsync(ValidService());
        var projectDto = ValidProject();
        projectDto.ServiceIds = [service.Value!.Id];
        await _service.CreateProjectAsync(projectDto);
        _fixture.Db.ChangeTracker.Clear();

        var row = Assert.Single(await _service.ListServicesAsync());

        Assert.Equal(1, row.LinkedProjectCount);
    }

    /* ==================================================================== */
    /*  FAQs — the review gate                                              */
    /* ==================================================================== */

    private static FaqWriteDto ValidFaq() => new()
    {
        Question = "Do you charge for an estimate?",
        Answer = string.Empty,
        Category = "Getting started",
        CategorySlug = "getting-started",
        NeedsReview = true,
        ReviewNote = "Confirm whether estimates are free.",
        IsActive = true,
    };

    [Fact]
    public async Task A_held_back_question_cannot_be_published_without_an_answer()
    {
        var created = await _service.CreateFaqAsync(ValidFaq());
        Assert.True(created.Ok);

        var attempt = ValidFaq();
        attempt.NeedsReview = false;
        attempt.Answer = "   ";
        attempt.RowVersion = created.Value!.RowVersion;

        var result = await _service.UpdateFaqAsync(created.Value.Id, attempt);

        Assert.False(result.Ok);
        Assert.Equal(WriteFailure.Validation, result.Failure);
    }

    [Fact]
    public async Task Writing_a_real_answer_releases_the_question()
    {
        var created = await _service.CreateFaqAsync(ValidFaq());

        var answered = ValidFaq();
        answered.NeedsReview = false;
        answered.Answer = "No. The first visit and the written estimate are both free.";
        answered.RowVersion = created.Value!.RowVersion;

        var result = await _service.UpdateFaqAsync(created.Value.Id, answered);

        Assert.True(result.Ok);
        Assert.False(result.Value!.NeedsReview);
        Assert.Equal("No. The first visit and the written estimate are both free.", result.Value.Answer);
    }

    [Fact]
    public async Task A_question_may_be_created_with_no_answer_while_it_is_held_back()
    {
        var result = await _service.CreateFaqAsync(ValidFaq());

        Assert.True(result.Ok);
        Assert.True(result.Value!.NeedsReview);
        Assert.Equal(string.Empty, result.Value.Answer);
    }

    /* ==================================================================== */
    /*  Testimonials                                                        */
    /* ==================================================================== */

    private static TestimonialWriteDto ValidTestimonial() => new()
    {
        FirstName = "Dana",
        LastInitial = "O",
        Rating = 5,
        Quote = "They did the work properly and cleaned up every evening.",
        IsActive = true,
        Source = TestimonialSource.Direct,
    };

    [Fact]
    public async Task A_review_added_in_the_console_is_never_marked_as_an_example()
    {
        // The reverse would be far worse than a bug: a demonstration quote
        // presented as a real customer.
        var result = await _service.CreateTestimonialAsync(ValidTestimonial());

        Assert.True(result.Ok);
        Assert.False(result.Value!.IsSampleContent);
    }

    [Fact]
    public async Task Editing_a_seeded_example_review_does_not_turn_it_into_a_real_one()
    {
        await _fixture.SeedSampleContentAsync();
        var sample = await _fixture.Db.CustomerTestimonials.FirstAsync(t => t.IsSampleContent);
        _fixture.Db.ChangeTracker.Clear();

        var dto = ValidTestimonial();
        dto.Quote = "Reworded by an administrator.";
        var result = await _service.UpdateTestimonialAsync(sample.Id, dto);

        Assert.True(result.Ok);
        // Still labelled, still excluded from review markup.
        Assert.True(result.Value!.IsSampleContent);
    }

    /* ==================================================================== */
    /*  Service areas                                                       */
    /* ==================================================================== */

    [Fact]
    public async Task Editing_a_placeholder_area_makes_it_a_real_one()
    {
        await _fixture.SeedSampleContentAsync();
        var placeholder = await _fixture.Db.ServiceAreas.FirstAsync(a => a.IsSampleContent);
        _fixture.Db.ChangeTracker.Clear();

        var result = await _service.UpdateServiceAreaAsync(placeholder.Id, new ServiceAreaWriteDto
        {
            Name = "Loveland",
            Kind = ServiceAreaKind.City,
            StateOrRegion = "OH",
            IsActive = true,
        });

        Assert.True(result.Ok);
        Assert.Equal("Loveland", result.Value!.Name);
        // The "coverage is being confirmed" warning depends on this flag.
        Assert.False(result.Value.IsSampleContent);
    }

    [Fact]
    public async Task A_service_area_created_in_the_console_is_real_from_the_start()
    {
        var result = await _service.CreateServiceAreaAsync(new ServiceAreaWriteDto
        {
            Name = "Milford",
            Kind = ServiceAreaKind.City,
            PostalCodes = ["45150"],
            IsActive = true,
        });

        Assert.True(result.Ok);
        Assert.False(result.Value!.IsSampleContent);
    }

    /* ==================================================================== */
    /*  Cache invalidation                                                  */
    /* ==================================================================== */

    [Fact]
    public async Task Every_content_write_bumps_the_public_content_version()
    {
        /*
         * Without this the public endpoints would keep serving their previous
         * ETag, and an owner could publish something and be unable to see it
         * for the whole cache window with nothing to explain why.
         */
        var before = _version.Bumps;

        await _service.CreateServiceAsync(ValidService());
        await _service.CreateTestimonialAsync(ValidTestimonial());
        await _service.CreateFaqAsync(ValidFaq());
        await _service.CreateServiceAreaAsync(new ServiceAreaWriteDto
        {
            Name = "Milford",
            Kind = ServiceAreaKind.City,
            IsActive = true,
        });
        await _service.CreateProjectAsync(ValidProject());

        Assert.Equal(before + 5, _version.Bumps);
    }
}
