using KellumsSecondChance.Server.Services;

namespace KellumsSecondChance.Server.Tests;

public class ContentServiceTests : IAsyncLifetime
{
    private readonly TestDatabase _fixture = new();
    private ContentService _service = null!;

    public async Task InitializeAsync()
    {
        await _fixture.SeedSampleContentAsync();
        _service = new ContentService(_fixture.Db);
    }

    public Task DisposeAsync()
    {
        _fixture.Dispose();
        return Task.CompletedTask;
    }

    /* --------------------------------------------------------- services */

    [Fact]
    public async Task GetServices_returns_active_services_in_display_order()
    {
        var services = await _service.GetServicesAsync();

        Assert.NotEmpty(services);
        Assert.Equal(
            services.Select(s => s.DisplayOrder).Order(),
            services.Select(s => s.DisplayOrder));
    }

    [Fact]
    public async Task GetServices_excludes_deactivated_records()
    {
        var target = _fixture.Db.RenovationServices.First();
        target.IsActive = false;
        await _fixture.Db.SaveChangesAsync();

        var services = await _service.GetServicesAsync();

        Assert.DoesNotContain(services, s => s.Slug == target.Slug);
    }

    [Fact]
    public async Task GetService_by_slug_returns_full_detail()
    {
        var service = await _service.GetServiceAsync("kitchen-remodeling");

        Assert.NotNull(service);
        Assert.Equal("Kitchen Remodeling", service.Name);
        Assert.NotEmpty(service.Includes);
        Assert.NotEmpty(service.Considerations);
        // The join to projects must resolve, not come back empty.
        Assert.NotEmpty(service.RelatedProjectSlugs);
    }

    [Fact]
    public async Task GetService_returns_null_for_an_unknown_slug()
    {
        var service = await _service.GetServiceAsync("not-a-real-service");

        Assert.Null(service);
    }

    /* --------------------------------------------------------- projects */

    [Fact]
    public async Task GetProjects_returns_every_active_project()
    {
        var projects = await _service.GetProjectsAsync(null, false, null, null);

        Assert.Equal(6, projects.Count);
    }

    [Fact]
    public async Task GetProjects_filters_by_category()
    {
        var projects = await _service.GetProjectsAsync(
            "kitchen-remodeling", false, null, null);

        Assert.NotEmpty(projects);
        Assert.All(projects, p => Assert.Equal("kitchen-remodeling", p.CategorySlug));
    }

    [Fact]
    public async Task GetProjects_treats_the_all_category_as_no_filter()
    {
        var all = await _service.GetProjectsAsync("all", false, null, null);

        Assert.Equal(6, all.Count);
    }

    [Fact]
    public async Task GetProjects_search_matches_title_and_summary()
    {
        var projects = await _service.GetProjectsAsync(
            null, false, "basement", null);

        Assert.Contains(projects, p => p.Slug == "oakridge-basement");
    }

    [Fact]
    public async Task GetProjects_search_with_no_match_returns_empty_rather_than_everything()
    {
        var projects = await _service.GetProjectsAsync(
            null, false, "zzzz-no-such-thing", null);

        Assert.Empty(projects);
    }

    [Fact]
    public async Task GetProjects_take_is_clamped_and_respected()
    {
        var projects = await _service.GetProjectsAsync(null, false, null, 2);

        Assert.Equal(2, projects.Count);
    }

    [Fact]
    public async Task GetProjects_featuredOnly_returns_only_featured_projects()
    {
        var projects = await _service.GetProjectsAsync(null, true, null, null);

        Assert.NotEmpty(projects);
        Assert.All(projects, p => Assert.True(p.IsFeatured));
    }

    [Fact]
    public async Task GetProjects_flags_seeded_case_studies_as_sample_content()
    {
        var projects = await _service.GetProjectsAsync(null, false, null, null);

        // The UI keys its "written example" label off this; without it, a seeded
        // case study reads as a record of real work.
        Assert.All(projects, p => Assert.True(p.IsSampleContent));
    }

    [Fact]
    public async Task GetProject_detail_carries_the_sample_content_flag()
    {
        var project = await _service.GetProjectAsync("oakridge-basement");

        Assert.NotNull(project);
        Assert.True(project.IsSampleContent);
    }

    [Fact]
    public async Task GetProjects_resolves_a_cover_image_and_before_after_flag()
    {
        var projects = await _service.GetProjectsAsync(null, false, null, null);

        var kitchen = Assert.Single(projects, p => p.Slug == "maple-street-kitchen");
        Assert.NotNull(kitchen.CoverImage);
        Assert.True(kitchen.CoverImage.Width > 0);
        Assert.True(kitchen.CoverImage.Height > 0);
        Assert.False(string.IsNullOrWhiteSpace(kitchen.CoverImage.Alt));
        Assert.True(kitchen.HasBeforeAfter);
    }

    [Fact]
    public async Task GetProject_by_slug_returns_the_case_study_with_images_and_services()
    {
        var project = await _service.GetProjectAsync("harborview-primary-bath");

        Assert.NotNull(project);
        Assert.NotEmpty(project.Images);
        Assert.NotEmpty(project.ServiceSlugs);
        Assert.Equal(project.ServiceSlugs.Count, project.ServiceNames.Count);
        Assert.Contains(project.Images, i => i.Kind == "Before");
        Assert.Contains(project.Images, i => i.Kind == "After");
    }

    [Fact]
    public async Task GetProject_returns_null_for_an_unknown_slug()
    {
        var project = await _service.GetProjectAsync("no-such-project");

        Assert.Null(project);
    }

    [Fact]
    public async Task GetProject_does_not_return_a_deactivated_project()
    {
        var target = _fixture.Db.RenovationProjects.First();
        target.IsActive = false;
        await _fixture.Db.SaveChangesAsync();

        var project = await _service.GetProjectAsync(target.Slug);

        Assert.Null(project);
    }

    [Fact]
    public async Task GetTransformations_only_returns_projects_with_a_matched_pair()
    {
        var transformations = await _service.GetTransformationsAsync(4);

        Assert.NotEmpty(transformations);
        Assert.All(transformations, p =>
        {
            Assert.True(p.IsFeatured);
            Assert.Contains(p.Images, i => i.Kind == "Before");
            Assert.Contains(p.Images, i => i.Kind == "After");
        });
    }

    [Fact]
    public async Task GetTransformations_clamps_an_absurd_take_value()
    {
        var transformations = await _service.GetTransformationsAsync(10_000);

        Assert.True(transformations.Count <= 12);
    }

    [Fact]
    public async Task GetProjectCategories_returns_distinct_categories_with_counts()
    {
        var categories = await _service.GetProjectCategoriesAsync();

        Assert.NotEmpty(categories);
        Assert.Equal(categories.Select(c => c.Slug).Distinct().Count(), categories.Count);
        Assert.All(categories, c => Assert.True(c.Count > 0));
    }

    /* ----------------------------------------------------- testimonials */

    [Fact]
    public async Task GetTestimonials_flags_every_seeded_review_as_sample_content()
    {
        var testimonials = await _service.GetTestimonialsAsync(false);

        Assert.NotEmpty(testimonials);
        // Guards the honesty rule: seeded reviews must never look authentic.
        Assert.All(testimonials, t => Assert.True(t.IsSampleContent));
    }

    [Fact]
    public async Task GetTestimonials_featuredOnly_narrows_the_set()
    {
        var all = await _service.GetTestimonialsAsync(false);
        var featured = await _service.GetTestimonialsAsync(true);

        Assert.True(featured.Count < all.Count);
        Assert.All(featured, t => Assert.True(t.IsFeatured));
    }

    [Fact]
    public async Task Testimonial_ratings_are_within_range()
    {
        var testimonials = await _service.GetTestimonialsAsync(false);

        Assert.All(testimonials, t => Assert.InRange(t.Rating, (byte)1, (byte)5));
    }

    /* ------------------------------------------------------------- faqs */

    [Fact]
    public async Task GetFaqs_returns_ordered_items_across_several_categories()
    {
        var faqs = await _service.GetFaqsAsync();

        Assert.NotEmpty(faqs);
        Assert.True(faqs.Select(f => f.CategorySlug).Distinct().Count() > 3);
        Assert.Equal(faqs.Select(f => f.DisplayOrder).Order(), faqs.Select(f => f.DisplayOrder));
    }

    [Fact]
    public async Task GetFaqs_withholds_questions_that_await_a_business_decision()
    {
        var published = await _service.GetFaqsAsync();

        // Publishing a plausible guess about deposits or warranties would be
        // exactly the fabricated claim this site refuses to make.
        Assert.All(published, f => Assert.False(f.NeedsReview));
        Assert.All(published, f => Assert.False(string.IsNullOrWhiteSpace(f.Answer)));
    }

    [Fact]
    public async Task GetFaqs_never_leaks_the_staff_review_note_to_a_public_caller()
    {
        var published = await _service.GetFaqsAsync();

        Assert.All(published, f => Assert.Null(f.ReviewNote));
    }

    [Fact]
    public async Task GetFaqs_shows_pending_questions_and_their_notes_to_the_admin_console()
    {
        var published = await _service.GetFaqsAsync();
        var everything = await _service.GetFaqsAsync(includePendingReview: true);

        var pending = everything.Where(f => f.NeedsReview).ToList();
        Assert.NotEmpty(pending);
        Assert.Equal(published.Count + pending.Count, everything.Count);
        Assert.All(pending, f => Assert.False(string.IsNullOrWhiteSpace(f.ReviewNote)));
    }

    [Fact]
    public async Task No_published_answer_contains_an_internal_editorial_marker()
    {
        var published = await _service.GetFaqsAsync();

        // The marker is the literal "CONFIRM:" prefix, not the ordinary word
        // "confirm" — which legitimately appears in several answers.
        Assert.All(published, f => Assert.DoesNotContain("CONFIRM:", f.Answer, StringComparison.Ordinal));
    }

    /* ---------------------------------------------------- service areas */

    [Fact]
    public async Task GetServiceAreas_flags_placeholder_geography_as_sample_content()
    {
        var areas = await _service.GetServiceAreasAsync();

        Assert.NotEmpty(areas);
        Assert.All(areas, a => Assert.True(a.IsSampleContent));
    }
}
