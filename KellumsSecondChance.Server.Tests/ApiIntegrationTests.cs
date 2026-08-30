using System.Net;
using System.Net.Http.Json;
using KellumsSecondChance.Server.Data;
using KellumsSecondChance.Server.Dtos;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace KellumsSecondChance.Server.Tests;

/// <summary>
/// Boots the real application pipeline against a SQLite database so routing,
/// model binding, authorisation and the problem-details contract are all
/// exercised end to end.
/// </summary>
public class KellumsApiFactory : WebApplicationFactory<Program>
{
    private SqliteConnection? _connection;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(Environments.Development);

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
    [InlineData("/api/services")]
    [InlineData("/api/projects")]
    [InlineData("/api/projects/categories")]
    [InlineData("/api/projects/transformations")]
    [InlineData("/api/testimonials")]
    [InlineData("/api/faqs")]
    [InlineData("/api/service-areas")]
    [InlineData("/api/site-content")]
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
    public async Task Site_content_never_invents_contact_details()
    {
        var content = await Client().GetFromJsonAsync<SiteContentDto>(
            "/api/site-content");

        Assert.NotNull(content);
        Assert.False(string.IsNullOrWhiteSpace(content.BusinessName));
        // Nothing was configured, so nothing may be published.
        Assert.Null(content.PhoneDisplay);
        Assert.Null(content.PhoneE164);
        Assert.Null(content.Email);
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

    /* ------------------------------------------------------------ admin */

    [Theory]
    [InlineData("/api/admin/estimate-requests")]
    [InlineData("/api/admin/auth/me")]
    [InlineData("/api/admin/content/services")]
    [InlineData("/api/admin/content/projects")]
    [InlineData("/api/admin/content/testimonials")]
    [InlineData("/api/admin/content/faqs")]
    [InlineData("/api/admin/content/service-areas")]
    public async Task Admin_endpoints_reject_anonymous_reads_with_401(string path)
    {
        var response = await Client().GetAsync(path);

        // 401, never a 302 to a login page the SPA cannot follow.
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Admin_mutations_reject_anonymous_callers()
    {
        var response = await Client().PatchAsJsonAsync(
            "/api/admin/estimate-requests/1",
            new { status = "Won" },
            CancellationToken.None);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
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
