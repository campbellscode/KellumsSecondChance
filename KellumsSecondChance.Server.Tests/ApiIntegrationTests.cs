using System.Net;
using System.Net.Http.Json;
using KellumsSecondChance.Server.Data;
using KellumsSecondChance.Server.Dtos;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using KellumsSecondChance.Server.Domain.Enums;

namespace KellumsSecondChance.Server.Tests;

/// <summary>
/// Boots the real application pipeline against a SQLite database so routing,
/// model binding, authorisation and the problem-details contract are all
/// exercised end to end.
/// </summary>
public class KellumsApiFactory : WebApplicationFactory<Program>
{
    private SqliteConnection? _connection;
    protected virtual string AppEnvironment => Environments.Development;
    protected virtual string? ProductionSiteUrl => "https://kellumssecondchance.com";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(AppEnvironment);

        if (AppEnvironment == Environments.Production)
        {
            builder.UseSetting("ConnectionStrings:KellumsDatabase", "Server=(local);Database=unused;Trusted_Connection=True;TrustServerCertificate=True");
            if (ProductionSiteUrl is not null)
                builder.UseSetting("Production:SiteUrl", ProductionSiteUrl);
            builder.UseSetting("Production:DataProtectionKeyPath", Path.Combine(Path.GetTempPath(), "kellums-test-keys"));
            builder.ConfigureAppConfiguration((_, configuration) =>
            {
                var settings = new Dictionary<string, string?>
                {
                    ["Production:DataProtectionKeyPath"] = Path.Combine(Path.GetTempPath(), "kellums-test-keys"),
                    ["ConnectionStrings:KellumsDatabase"] = "Server=(local);Database=unused;Trusted_Connection=True;TrustServerCertificate=True",
                };
                if (ProductionSiteUrl is not null)
                    settings["Production:SiteUrl"] = ProductionSiteUrl;
                configuration.AddInMemoryCollection(settings);
            });
        }

        builder.ConfigureServices(services =>
        {
            // Swap SQL Server for an in-memory SQLite database owned by this factory.
            var descriptors = services
                .Where(d =>
                    d.ServiceType == typeof(DbContextOptions<KellumsDbContext>)
                    || d.ServiceType == typeof(KellumsDbContext)
                    || (d.ServiceType.FullName?.Contains("DbContextOptions") ?? false))
                .ToList();

            foreach (var descriptor in descriptors) services.Remove(descriptor);

            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();

            services.AddDbContext<KellumsDbContext>(options => options.UseSqlite(_connection));

            // The seeder is a hosted service; it is not wanted here — tests
            // populate exactly what they need.
            var hosted = services
                .Where(d => d.ImplementationType?.Name == "DatabaseSeeder")
                .ToList();
            foreach (var descriptor in hosted) services.Remove(descriptor);

            using var provider = services.BuildServiceProvider();
            using var scope = provider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<KellumsDbContext>();
            db.Database.EnsureCreated();
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing) _connection?.Dispose();
    }
}

public class ApiIntegrationTests(KellumsApiFactory factory) : IClassFixture<KellumsApiFactory>
{
    private HttpClient Client() => factory.CreateClient(new WebApplicationFactoryClientOptions
    {
        AllowAutoRedirect = false,
    });

    /* ---------------------------------------------------- public routes */

    [Theory]
    [InlineData("/", "Kellum&#39;s Second Chance Renovations")]
    [InlineData("/about", "About | Kellum&#39;s Second Chance Renovations")]
    [InlineData("/work-with-us", "Work With Us | Kellum&#39;s Second Chance Renovations")]
    [InlineData("/gallery", "Gallery | Kellum&#39;s Second Chance Renovations")]
    [InlineData("/bookings", "Bookings | Kellum&#39;s Second Chance Renovations")]
    public async Task Spa_shell_returns_route_specific_non_javascript_metadata(string path, string encodedTitle)
    {
        var response = await Client().GetAsync(path + "?utm_source=test");
        var html = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("noindex", response.Headers.GetValues("X-Robots-Tag").Single());
        Assert.Contains("name=\"robots\" content=\"noindex, nofollow\" data-runtime-indexing=\"disabled\"", html);
        Assert.Single(System.Text.RegularExpressions.Regex.Matches(html, "name=\\\"robots\\\"").Cast<System.Text.RegularExpressions.Match>());
        Assert.Contains($"<title>{encodedTitle}</title>", html);
        Assert.Contains("rel=\"canonical\"", html);
        Assert.DoesNotContain("utm_source", html);
        Assert.Contains("property=\"og:title\"", html);
        Assert.Contains("property=\"og:image\"", html);
        Assert.Contains("name=\"twitter:image\"", html);
        Assert.Contains("name=\"twitter:card\" content=\"summary_large_image\"", html);
        Assert.Contains("/media/social/social-thumbnail-1.png", html);
        Assert.Contains("property=\"og:image:width\" content=\"1731\"", html);
        Assert.Contains("property=\"og:image:height\" content=\"909\"", html);
        Assert.Single(System.Text.RegularExpressions.Regex.Matches(html, "property=\\\"og:image\\\"").Cast<System.Text.RegularExpressions.Match>());
        Assert.Single(System.Text.RegularExpressions.Regex.Matches(html, "name=\\\"twitter:image\\\"").Cast<System.Text.RegularExpressions.Match>());
    }

    [Fact]
    public async Task Development_metadata_uses_the_public_request_origin_when_no_site_url_is_configured()
    {
        var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://dev.kellumssecondchance.com"),
            AllowAutoRedirect = false,
        });

        var html = await client.GetStringAsync("/");

        Assert.Contains("rel=\"canonical\" href=\"https://dev.kellumssecondchance.com/\"", html);
        Assert.Contains("property=\"og:url\" content=\"https://dev.kellumssecondchance.com/\"", html);
        Assert.Contains("property=\"og:image\" content=\"https://dev.kellumssecondchance.com/media/social/social-thumbnail-1.png\"", html);
        Assert.DoesNotContain("http://localhost", html, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("facebookexternalhit/1.1")]
    [InlineData("Facebot")]
    [InlineData("Meta-ExternalAgent/1.1")]
    [InlineData("Meta-ExternalFetcher/1.1")]
    public async Task Public_metadata_does_not_block_social_preview_user_agents(string userAgent)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/");
        request.Headers.UserAgent.ParseAdd(userAgent);

        var response = await Client().SendAsync(request);
        var html = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("noindex", response.Headers.GetValues("X-Robots-Tag").Single());
        Assert.Contains("property=\"og:title\"", html);
        Assert.Contains("name=\"twitter:card\"", html);
    }

    [Fact]
    public async Task Booking_request_is_saved_as_pending_and_admin_route_is_authorized()
    {
        var preferred = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(3));
        var response = await Client().PostAsJsonAsync("/api/booking-requests", new
        {
            firstName = "Avery", lastName = "Homeowner", email = "avery@example.com", phone = "513-555-0101",
            preferredDate = preferred, preferredTime = new TimeOnly(10, 30),
            address = "1 Main St", city = "Cincinnati", state = "OH", postalCode = "45236",
            projectDescription = "Please inspect the exterior siding and trim.", elapsedMs = 5000,
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<KellumsDbContext>();
        var saved = await db.BookingRequests.AsNoTracking().SingleAsync(x => x.Email == "avery@example.com");
        Assert.Equal(BookingRequestStatus.Pending, saved.Status);
        Assert.Equal(preferred, saved.PreferredDate);
        var unauthorized = await Client().GetAsync("/api/admin/bookings");
        Assert.Equal(HttpStatusCode.Unauthorized, unauthorized.StatusCode);
    }

    [Fact]
    public async Task Booking_request_rejects_a_past_date()
    {
        var response = await Client().PostAsJsonAsync("/api/booking-requests", new
        {
            firstName = "Avery", lastName = "Homeowner", email = "past@example.com", phone = "513-555-0101",
            preferredDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1)), preferredTime = new TimeOnly(10, 30),
            address = "1 Main St", city = "Cincinnati", state = "OH", postalCode = "45236",
            projectDescription = "Please inspect the exterior siding and trim.", elapsedMs = 5000,
        });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("/not-a-real-route")]
    [InlineData("/services/not-a-real-service")]
    [InlineData("/projects/not-a-real-project")]
    public async Task Unknown_and_nonpublic_spa_routes_are_real_404s(string path)
    {
        Assert.Equal(HttpStatusCode.NotFound, (await Client().GetAsync(path)).StatusCode);
    }

    [Fact]
    public async Task Liveness_is_sanitized_and_readiness_has_only_status()
    {
        var live = await Client().GetAsync("/health/live");
        var ready = await Client().GetAsync("/health/ready");
        Assert.Equal(HttpStatusCode.OK, live.StatusCode);
        var text = await ready.Content.ReadAsStringAsync();
        Assert.DoesNotContain("ConnectionStrings", text, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("wwwroot", text, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("stack", text, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Sitemap_and_robots_use_public_routes_without_private_content()
    {
        var sitemap = await Client().GetStringAsync("/sitemap.xml");
        var robots = await Client().GetStringAsync("/robots.txt");
        Assert.Contains("/work-with-us", sitemap);
        Assert.DoesNotContain("/admin", sitemap);
        Assert.DoesNotContain("estimate-requests", sitemap);
        Assert.Contains("Sitemap:", robots);
    }

    [Theory]
    [InlineData("/api/services")]
    [InlineData("/api/projects")]
    [InlineData("/api/projects/categories")]
    [InlineData("/api/projects/transformations")]
    [InlineData("/api/testimonials")]
    [InlineData("/api/faqs")]
    [InlineData("/api/service-areas")]
    [InlineData("/api/site-content")]
    [InlineData("/api/gallery")]
    public async Task Public_read_endpoints_are_anonymous_and_return_json(string path)
    {
        var response = await Client().GetAsync(path);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task An_unknown_project_slug_returns_a_problem_document()
    {
        var response = await Client().GetAsync("/api/projects/nothing-here");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Contains("problem+json", response.Content.Headers.ContentType?.MediaType ?? string.Empty);
    }

    [Fact]
    public async Task An_unknown_service_slug_returns_404()
    {
        var response = await Client().GetAsync("/api/services/nothing-here");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Site_content_publishes_only_the_confirmed_contact_defaults()
    {
        var content = await Client().GetFromJsonAsync<SiteContentDto>(
            "/api/site-content");

        Assert.NotNull(content);
        Assert.False(string.IsNullOrWhiteSpace(content.BusinessName));
        Assert.Equal("513-620-0130", content.PhoneDisplay);
        Assert.Equal("+15136200130", content.PhoneE164);
        Assert.Equal("secondchancerenov@gmail.com", content.Email);
        Assert.Equal("Cincinnati", content.AddressLocality);
        Assert.Equal("OH", content.AddressRegion);
        Assert.Equal("45236", content.AddressPostalCode);
        Assert.Null(content.AddressLine1);
        Assert.Empty(content.OfficeHours);
    }

    /* -------------------------------------------------- security headers */

    [Fact]
    public async Task Responses_carry_the_security_headers()
    {
        var response = await Client().GetAsync("/api/services");

        Assert.True(response.Headers.Contains("X-Content-Type-Options"));
        Assert.True(response.Headers.Contains("Content-Security-Policy"));
        Assert.True(response.Headers.Contains("Referrer-Policy"));
        Assert.Equal("DENY", response.Headers.GetValues("X-Frame-Options").Single());
    }

    [Fact]
    public async Task The_content_security_policy_forbids_framing_and_object_embeds()
    {
        var response = await Client().GetAsync("/api/services");
        var csp = response.Headers.GetValues("Content-Security-Policy").Single();

        Assert.Contains("frame-ancestors 'none'", csp);
        Assert.Contains("frame-src https://www.google.com", csp);
        Assert.Contains("object-src 'none'", csp);
        Assert.Contains("base-uri 'self'", csp);
    }

    /* ------------------------------------------------ estimate endpoint */

    [Fact]
    public async Task An_invalid_estimate_submission_returns_field_level_errors()
    {
        var response = await Client().PostAsJsonAsync(
            "/api/estimate-requests",
            new { firstName = "", lastName = "", email = "nope", postalCode = "", description = "x" },
            CancellationToken.None);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemResponse>(
            CancellationToken.None);
        Assert.NotNull(problem?.Errors);
        Assert.NotEmpty(problem.Errors);
    }

    [Fact]
    public async Task A_valid_estimate_submission_is_accepted_and_returns_a_reference()
    {
        var response = await Client().PostAsJsonAsync(
            "/api/estimate-requests",
            new
            {
                firstName = "Ruth",
                lastName = "Alvarez",
                email = "ruth@example.com",
                projectTypeSlugs = new[] { "bathroom-renovations" },
                propertyType = "SingleFamily",
                postalCode = "54321",
                timeline = "WithinOneMonth",
                budgetRange = "From15kTo35k",
                description = "The primary bathroom floor flexes near the shower and the grout has failed.",
                preferredContactMethod = "Email",
                elapsedMs = 30000,
            },
            CancellationToken.None);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var result = await response.Content.ReadFromJsonAsync<EstimateRequestResultDto>(
            CancellationToken.None);
        Assert.NotNull(result);
        Assert.StartsWith("KSC-", result.Reference);
    }

    [Fact]
    public async Task A_valid_employment_interest_is_saved_with_server_controlled_private_fields()
    {
        using var isolated = new KellumsApiFactory();
        var response = await isolated.CreateClient().PostAsJsonAsync("/api/employment-interests", new
        {
            firstName = "Jordan", lastName = "Lee", email = "jordan@example.com",
            phone = "513-555-0100", preferredContactMethod = "Email",
            generalWorkExperience = "Residential maintenance", areasOfExperience = "Painting and trim",
            workInterest = "Renovation crew", availability = "Weekdays", message = "Ready to learn.",
            status = "Archived", internalNotes = "must not bind", elapsedMs = 30000,
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("internalNotes", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("rowVersion", body, StringComparison.OrdinalIgnoreCase);

        using var scope = isolated.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<KellumsDbContext>();
        var saved = await db.EmploymentInterests.AsNoTracking().SingleAsync(x => x.Email == "jordan@example.com");
        Assert.Equal(EmploymentInterestStatus.New, saved.Status);
        Assert.Null(saved.InternalNotes);
        Assert.NotEqual(default, saved.CreatedAtUtc);
    }

    [Fact]
    public async Task Employment_honeypot_and_too_fast_submissions_are_not_saved()
    {
        using var isolated = new KellumsApiFactory();
        var client = isolated.CreateClient();
        foreach (var payload in new object[] {
            new { firstName="Bot", lastName="One", email="bot-one@example.com", workInterest="Crew", companyWebsite="spam.example", elapsedMs=30000 },
            new { firstName="Bot", lastName="Two", email="bot-two@example.com", workInterest="Crew", companyWebsite="", elapsedMs=1 },
        }) Assert.Equal(HttpStatusCode.Created, (await client.PostAsJsonAsync("/api/employment-interests", payload)).StatusCode);

        using var scope = isolated.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<KellumsDbContext>();
        Assert.False(await db.EmploymentInterests.AnyAsync(x => x.Email.StartsWith("bot-")));
    }

    [Fact]
    public async Task Invalid_employment_contact_details_return_validation_errors()
    {
        using var isolated = new KellumsApiFactory();
        var response = await isolated.CreateClient().PostAsJsonAsync("/api/employment-interests", new
        { firstName="", lastName="", email="not-an-email", phone="abc", preferredContactMethod="CarrierPigeon", workInterest="" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    /* ------------------------------------------------------- caching */

    /// <summary>
    /// Conditional requests on the public content endpoints.
    ///
    /// The ETag comes from IContentVersion, which every admin write bumps. The
    /// combination is what stops an owner publishing a project and then being
    /// unable to see it for the length of the cache window.
    /// </summary>
    [Theory]
    [InlineData("/api/services")]
    [InlineData("/api/projects")]
    [InlineData("/api/testimonials")]
    [InlineData("/api/faqs")]
    [InlineData("/api/service-areas")]
    [InlineData("/api/site-content")]
    public async Task Public_content_carries_an_etag_and_a_short_revalidating_cache(string path)
    {
        var response = await Client().GetAsync(path);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var etag = response.Headers.ETag;
        Assert.NotNull(etag);

        var cacheControl = response.Headers.CacheControl;
        Assert.NotNull(cacheControl);
        Assert.True(cacheControl.Public);
        Assert.True(cacheControl.MustRevalidate);
        // Long enough to be worth having, short enough that a publish shows up.
        Assert.True(cacheControl.MaxAge <= TimeSpan.FromMinutes(5));
    }

    [Fact]
    public async Task A_matching_if_none_match_gets_an_empty_304()
    {
        var client = Client();

        var first = await client.GetAsync("/api/services");
        var etag = first.Headers.ETag!.ToString();

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/services");
        request.Headers.Add("If-None-Match", etag);
        var second = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NotModified, second.StatusCode);
        Assert.Empty(await second.Content.ReadAsByteArrayAsync());
    }

    [Fact]
    public async Task A_wildcard_if_none_match_is_honoured()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/faqs");
        request.Headers.Add("If-None-Match", "*");

        var response = await Client().SendAsync(request);

        Assert.Equal(HttpStatusCode.NotModified, response.StatusCode);
    }

    [Fact]
    public async Task A_stale_if_none_match_gets_the_full_response()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/services");
        request.Headers.Add("If-None-Match", "\"something-else-entirely\"");

        var response = await Client().SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Admin_responses_are_never_cached()
    {
        // A lead list held in a shared cache would be a data-disclosure bug.
        var response = await Client().GetAsync("/api/admin/auth/antiforgery");

        Assert.Equal("no-store", response.Headers.CacheControl?.ToString());
    }

    /* ------------------------------------------------------------ admin */

    [Theory]
    [InlineData("/api/admin/auth/me")]
    [InlineData("/api/admin/dashboard")]
    [InlineData("/api/admin/estimate-requests")]
    [InlineData("/api/admin/estimate-requests/1")]
    [InlineData("/api/admin/estimate-requests/project-types")]
    [InlineData("/api/admin/employment-interests")]
    [InlineData("/api/admin/employment-interests/1")]
    [InlineData("/api/admin/projects")]
    [InlineData("/api/admin/projects/1")]
    [InlineData("/api/admin/services")]
    [InlineData("/api/admin/testimonials")]
    [InlineData("/api/admin/faqs")]
    [InlineData("/api/admin/service-areas")]
    [InlineData("/api/admin/site-settings")]
    [InlineData("/api/admin/gallery")]
    public async Task Admin_endpoints_reject_anonymous_reads_with_401(string path)
    {
        var response = await Client().GetAsync(path);

        // 401, never a 302 to a login page the SPA cannot follow.
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    /// <summary>
    /// Every state-changing admin endpoint, called anonymously.
    ///
    /// This is the test that matters most in the whole suite. Hiding a button in
    /// the console protects nobody: the server has to refuse. A 401 here also
    /// proves authorisation runs BEFORE antiforgery and before model binding —
    /// an anonymous caller must not be able to tell a valid payload from an
    /// invalid one, or a real id from a missing one.
    /// </summary>
    [Theory]
    // Leads
    [InlineData("PUT", "/api/admin/estimate-requests/1/status")]
    [InlineData("POST", "/api/admin/estimate-requests/1/notes")]
    [InlineData("DELETE", "/api/admin/estimate-requests/1/notes/1")]
    [InlineData("POST", "/api/admin/estimate-requests/1/notification/retry")]
    [InlineData("PUT", "/api/admin/employment-interests/1")]
    [InlineData("POST", "/api/admin/employment-interests/1/notification/retry")]
    // Projects
    [InlineData("POST", "/api/admin/projects")]
    [InlineData("PUT", "/api/admin/projects/1")]
    [InlineData("DELETE", "/api/admin/projects/1")]
    [InlineData("POST", "/api/admin/gallery/upload")]
    [InlineData("PUT", "/api/admin/gallery/1")]
    [InlineData("DELETE", "/api/admin/gallery/1")]
    [InlineData("POST", "/api/admin/gallery/reorder")]
    // Project photographs
    [InlineData("POST", "/api/admin/projects/1/images")]
    [InlineData("PUT", "/api/admin/projects/1/images/1")]
    [InlineData("DELETE", "/api/admin/projects/1/images/1")]
    [InlineData("POST", "/api/admin/projects/1/images/reorder")]
    [InlineData("POST", "/api/admin/projects/1/images/1/cover")]
    [InlineData("POST", "/api/admin/projects/1/pairs")]
    [InlineData("DELETE", "/api/admin/projects/1/pairs/pair-abc")]
    // Catalogue
    [InlineData("POST", "/api/admin/services")]
    [InlineData("PUT", "/api/admin/services/1")]
    [InlineData("DELETE", "/api/admin/services/1")]
    [InlineData("POST", "/api/admin/testimonials")]
    [InlineData("PUT", "/api/admin/testimonials/1")]
    [InlineData("DELETE", "/api/admin/testimonials/1")]
    [InlineData("POST", "/api/admin/faqs")]
    [InlineData("PUT", "/api/admin/faqs/1")]
    [InlineData("DELETE", "/api/admin/faqs/1")]
    [InlineData("POST", "/api/admin/service-areas")]
    [InlineData("PUT", "/api/admin/service-areas/1")]
    [InlineData("DELETE", "/api/admin/service-areas/1")]
    // Business details
    [InlineData("PUT", "/api/admin/site-settings")]
    public async Task Every_admin_mutation_rejects_anonymous_callers(string method, string path)
    {
        var request = new HttpRequestMessage(new HttpMethod(method), path);
        if (method is "POST" or "PUT")
        {
            request.Content = JsonContent.Create(new { });
        }

        var response = await Client().SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    /// <summary>
    /// The same endpoints again, this time WITH a valid antiforgery token.
    ///
    /// A token is issued to anyone — it defends against cross-site forgery, not
    /// against being signed out. Holding one must never substitute for being an
    /// administrator.
    /// </summary>
    [Theory]
    [InlineData("POST", "/api/admin/projects")]
    [InlineData("PUT", "/api/admin/site-settings")]
    [InlineData("POST", "/api/admin/testimonials")]
    [InlineData("PUT", "/api/admin/estimate-requests/1/status")]
    [InlineData("POST", "/api/admin/estimate-requests/1/notification/retry")]
    [InlineData("POST", "/api/admin/employment-interests/1/notification/retry")]
    public async Task A_valid_antiforgery_token_does_not_stand_in_for_signing_in(
        string method,
        string path)
    {
        var client = Client();
        var tokens = await client.GetFromJsonAsync<AntiforgeryResponse>("/api/admin/auth/antiforgery");
        Assert.NotNull(tokens);

        var request = new HttpRequestMessage(new HttpMethod(method), path)
        {
            Content = JsonContent.Create(new { }),
        };
        request.Headers.Add("X-CSRF-TOKEN", tokens.Token);

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    /// <summary>
    /// Internal lead notes must never leak through a public route.
    ///
    /// The estimate-request controller is the one place where staff-only text
    /// lives next to a public POST endpoint, so the public surface is checked
    /// explicitly rather than assumed.
    /// </summary>
    [Theory]
    [InlineData("/api/estimate-requests/1")]
    [InlineData("/api/estimate-requests/1/notes")]
    [InlineData("/api/estimate-requests")]
    public async Task Lead_details_are_not_reachable_without_signing_in(string path)
    {
        var response = await Client().GetAsync(path);

        Assert.True(
            response.StatusCode is HttpStatusCode.NotFound
                or HttpStatusCode.Unauthorized
                or HttpStatusCode.MethodNotAllowed,
            $"{path} answered {(int)response.StatusCode}; internal lead data must never be public.");
    }

    [Fact]
    public async Task Sign_in_with_unknown_credentials_returns_a_generic_401()
    {
        var client = Client();
        var tokenResponse = await client.GetFromJsonAsync<AntiforgeryResponse>(
            "/api/admin/auth/antiforgery");
        Assert.NotNull(tokenResponse);

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/admin/auth/login")
        {
            Content = JsonContent.Create(new { email = "nobody@example.com", password = "NotARealPassword1!" }),
        };
        request.Headers.Add("X-CSRF-TOKEN", tokenResponse.Token);

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        // Must not reveal whether the account exists.
        Assert.DoesNotContain("not found", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("no such user", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Sign_in_without_an_antiforgery_token_is_rejected()
    {
        var response = await Client().PostAsJsonAsync(
            "/api/admin/auth/login",
            new { email = "someone@example.com", password = "NotARealPassword1!" },
            CancellationToken.None);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task There_is_no_public_registration_endpoint()
    {
        var response = await Client().PostAsJsonAsync(
            "/api/admin/auth/register",
            new { email = "attacker@example.com", password = "Password123!" },
            CancellationToken.None);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task An_unmatched_api_path_returns_404_rather_than_the_spa_shell()
    {
        var response = await Client().GetAsync("/api/does-not-exist");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("<html", body, StringComparison.OrdinalIgnoreCase);
    }

    private sealed record ValidationProblemResponse(Dictionary<string, string[]>? Errors);

    private sealed record AntiforgeryResponse(string Token);
}

public sealed class ProductionKellumsApiFactory : KellumsApiFactory
{
    protected override string AppEnvironment => Environments.Production;
}

public sealed class ProductionSeoIntegrationTests(ProductionKellumsApiFactory factory)
    : IClassFixture<ProductionKellumsApiFactory>
{
    [Fact]
    public async Task Production_public_html_remains_indexable()
    {
        var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://host-header.example"),
            AllowAutoRedirect = false,
        });

        var response = await client.GetAsync("/");
        var html = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(response.Headers.Contains("X-Robots-Tag"));
        Assert.Contains("name=\"robots\" content=\"index, follow, max-image-preview:large\" data-runtime-indexing=\"enabled\"", html);
        Assert.Single(System.Text.RegularExpressions.Regex.Matches(html, "name=\\\"robots\\\"").Cast<System.Text.RegularExpressions.Match>());
        Assert.DoesNotContain("noindex", html, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("property=\"og:title\"", html);
        Assert.Contains("rel=\"canonical\" href=\"https://kellumssecondchance.com/\"", html);
        Assert.Contains("property=\"og:url\" content=\"https://kellumssecondchance.com/\"", html);
        Assert.Contains("property=\"og:image\" content=\"https://kellumssecondchance.com/media/social/social-thumbnail-1.png\"", html);
        Assert.DoesNotContain("host-header.example", html, StringComparison.OrdinalIgnoreCase);
    }
}

public sealed class MissingProductionSiteUrlFactory : KellumsApiFactory
{
    protected override string AppEnvironment => Environments.Production;
    protected override string? ProductionSiteUrl => null;
}

public sealed class ProductionConfigurationIntegrationTests
{
    [Fact]
    public async Task Production_fails_startup_without_an_authoritative_site_url()
    {
        using var factory = new MissingProductionSiteUrlFactory();

        var exception = await Assert.ThrowsAnyAsync<Exception>(
            async () => await factory.CreateClient().GetAsync("/"));

        Assert.Contains("Production:SiteUrl must be an absolute HTTPS URL", exception.ToString());
    }
}
