using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using KellumsSecondChance.Server.Configuration;
using KellumsSecondChance.Server.Data;
using KellumsSecondChance.Server.Data.Seed;
using KellumsSecondChance.Server.Infrastructure;
using KellumsSecondChance.Server.Services;
using KellumsSecondChance.Server.Infrastructure.Media;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

/* ---------------------------------------------------------------- options */

builder.Services
    .AddOptions<BusinessOptions>()
    .Bind(builder.Configuration.GetSection(BusinessOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

builder.Services
    .AddOptions<AntiSpamOptions>()
    .Bind(builder.Configuration.GetSection(AntiSpamOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

builder.Services
    .AddOptions<SeedOptions>()
    .Bind(builder.Configuration.GetSection(SeedOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

builder.Services
    .AddOptions<MediaStorageOptions>()
    .Bind(builder.Configuration.GetSection(MediaStorageOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

builder.Services
    .AddOptions<NotificationOptions>()
    .Bind(builder.Configuration.GetSection(NotificationOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

/* --------------------------------------------------------------- database */

var connectionString = builder.Configuration.GetConnectionString("KellumsDatabase");

if (string.IsNullOrWhiteSpace(connectionString))
{
    /*
     * No connection string is a deployment mistake, but it must not stop the
     * host from starting: the SPA and its static assets still serve, and the
     * client falls back to its bundled content. The API surfaces a clear error
     * instead of the site going dark.
     */
    if (!builder.Environment.IsDevelopment())
    {
        throw new InvalidOperationException(
            "ConnectionStrings:KellumsDatabase is not configured. Set it via environment variable "
            + "(ConnectionStrings__KellumsDatabase) or a secret store before starting in this environment.");
    }

    connectionString =
        "Server=(localdb)\\mssqllocaldb;Database=KellumsSecondChance;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True";
}

builder.Services.AddDbContext<KellumsDbContext>(options =>
{
    options.UseSqlServer(connectionString, sql =>
    {
        sql.MigrationsAssembly(typeof(KellumsDbContext).Assembly.FullName);
        // Transient network faults are common against hosted SQL; retry them.
        sql.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: TimeSpan.FromSeconds(5), errorNumbersToAdd: null);
    });

    if (builder.Environment.IsDevelopment())
    {
        options.EnableDetailedErrors();
        // Deliberately NOT EnableSensitiveDataLogging: parameter values here are
        // homeowners' names, emails and addresses.
    }
});

/* --------------------------------------------------------------- identity */

builder.Services
    .AddIdentityCore<ApplicationUser>(options =>
    {
        options.User.RequireUniqueEmail = true;
        options.SignIn.RequireConfirmedAccount = false;

        options.Password.RequiredLength = 12;
        options.Password.RequireDigit = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireNonAlphanumeric = true;

        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.AllowedForNewUsers = true;
    })
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<KellumsDbContext>()
    .AddSignInManager()
    .AddDefaultTokenProviders();

builder.Services
    .AddAuthentication(IdentityConstants.ApplicationScheme)
    .AddIdentityCookies();

/*
 * Secure-only cookies everywhere except local development, where the SPA proxy
 * and the test host both speak plain HTTP. Production is HTTPS-only (HSTS plus
 * HTTPS redirection), so Always is the correct setting there.
 */
var cookieSecurePolicy = builder.Environment.IsDevelopment()
    ? CookieSecurePolicy.SameAsRequest
    : CookieSecurePolicy.Always;

builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.Name = "kellums.admin";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.SecurePolicy = cookieSecurePolicy;
    options.ExpireTimeSpan = TimeSpan.FromHours(8);
    options.SlidingExpiration = true;

    /*
     * This is an API, not a server-rendered app: an unauthenticated call must
     * get a 401, not a 302 to a login page the SPA cannot follow.
     */
    options.Events.OnRedirectToLogin = context =>
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    };
    options.Events.OnRedirectToAccessDenied = context =>
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    };
});

builder.Services
    .AddAuthorizationBuilder()
    .AddPolicy(AuthorizationPolicies.AdminOnly, policy =>
        policy.RequireAuthenticatedUser().RequireRole(Roles.Administrator));

/* ------------------------------------------------------------ antiforgery */

builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
    options.Cookie.Name = "kellums.csrf";
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.SecurePolicy = cookieSecurePolicy;
});

/* ---------------------------------------------------------- rate limiting */

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.ContentType = "application/problem+json";
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            context.HttpContext.Response.Headers.RetryAfter =
                ((int)retryAfter.TotalSeconds).ToString();
        }

        await context.HttpContext.Response.WriteAsJsonAsync(
            new ProblemDetails
            {
                Title = "That is a few too many requests in a row.",
                Detail = "Give it a minute and try again.",
                Status = StatusCodes.Status429TooManyRequests,
            },
            token);
    };

    // Public form submissions: generous enough for a person who makes a typo,
    // tight enough that a script cannot flood the inbox.
    options.AddPolicy(RateLimitPolicies.PublicSubmission, context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(10),
                QueueLimit = 0,
            }));

    // Sign-in attempts: blunts credential stuffing before Identity lockout even
    // gets involved, and applies across accounts rather than per account.
    options.AddPolicy(RateLimitPolicies.AuthAttempt, context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(5),
                QueueLimit = 0,
            }));
});

/* ------------------------------------------------------------- app services */

builder.Services.AddScoped<IContentService, ContentService>();
builder.Services.AddScoped<ISiteContentService, SiteContentService>();

/*
 * EstimateRequestService implements the public submission contract and the
 * admin contract from the same partial class, so both interfaces have to
 * resolve to the SAME scoped instance — otherwise one request could end up with
 * two DbContext-bound copies.
 */
builder.Services.AddScoped<EstimateRequestService>();
builder.Services.AddScoped<IEstimateRequestService>(sp => sp.GetRequiredService<EstimateRequestService>());
builder.Services.AddScoped<IEstimateRequestAdminService>(sp => sp.GetRequiredService<EstimateRequestService>());

/* Admin content management. */
builder.Services.AddScoped<IAdminContentService, AdminContentService>();
builder.Services.AddScoped<IProjectMediaService, ProjectMediaService>();
builder.Services.AddScoped<ISiteSettingsWriteService, SiteSettingsWriteService>();
builder.Services.AddScoped<IAdminDashboardService, AdminDashboardService>();
builder.Services.AddScoped<IAdminMediaService, AdminMediaService>();
builder.Services.AddScoped<IMediaStorage, LocalMediaStorage>();

/*
 * Content version: a process-wide value bumped by every admin content write and
 * emitted as the ETag on public content reads. Singleton by definition — a
 * scoped instance would reset on every request and never match.
 */
builder.Services.AddSingleton<IContentVersion, ContentVersion>();

/*
 * Lead notifications.
 *
 * No delivery provider is wired up in this build, so the sender writes to the
 * application log and reports honestly that nothing was transmitted. Replacing
 * INotificationSender is the whole job of adding real email later; nothing else
 * changes. See Services/NotificationService.cs.
 */
builder.Services.AddScoped<INotificationSender, LoggingNotificationSender>();
builder.Services.AddScoped<IEstimateRequestNotifier, EstimateRequestNotifier>();

builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        /*
         * Enums are exchanged as their names, not their ordinals. The client's
         * TypeScript contract uses string literal unions ('SingleFamily',
         * 'Won', …), and names survive an enum member being reordered.
         */
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    })
    .ConfigureApiBehaviorOptions(options =>
    {
        // Keep validation failures as RFC 9457 problem documents with a stable
        // `errors` map — the client maps those straight onto form fields.
        options.InvalidModelStateResponseFactory = context =>
        {
            var problem = new ValidationProblemDetails(context.ModelState)
            {
                Title = "Some of those details need another look.",
                Status = StatusCodes.Status400BadRequest,
                Instance = context.HttpContext.Request.Path,
            };
            problem.Extensions["traceId"] = context.HttpContext.TraceIdentifier;
            return new BadRequestObjectResult(problem)
            {
                ContentTypes = { "application/problem+json" },
            };
        };
    });

/*
 * Multipart ceiling for project photo uploads.
 *
 * This is the last line of defence: the endpoint carries its own
 * [RequestSizeLimit], and ProjectMediaService rejects anything over the
 * configured MaxUploadMegabytes after inspecting the bytes.
 */
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 16L * 1024 * 1024;
    options.ValueLengthLimit = 1024 * 1024;
    options.MultipartHeadersLengthLimit = 32 * 1024;
});

builder.Services.AddOpenApi();

builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
});

// Runs after the host is built; opt-in and never applies migrations.
builder.Services.AddHostedService<DatabaseSeeder>();

// Honour proxy headers so rate limiting and IP hashing see the real client.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    // Networks/proxies must be configured explicitly in production; clearing the
    // defaults prevents an untrusted client from spoofing X-Forwarded-For.
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

var app = builder.Build();

/* --------------------------------------------------------------- pipeline */

app.UseForwardedHeaders();
app.UseExceptionHandler();
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseResponseCompression();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
else
{
    app.UseHsts();
}

app.UseHttpsRedirection();

app.UseDefaultFiles();
app.MapStaticAssets();

/*
 * Uploaded project photography.
 *
 * Served from its own file provider rather than wwwroot, so the media root can
 * live outside the deployment folder and survive a redeploy. Two deliberate
 * restrictions:
 *
 *   - a fixed content-type map. Unknown extensions are NOT served, so even if
 *     something unexpected reached the folder it could never be handed back
 *     with an executable or scriptable content type;
 *   - X-Content-Type-Options: nosniff and a long immutable cache, which is safe
 *     because stored filenames are random and never reused.
 */
var mediaOptions = app.Services.GetRequiredService<IOptions<MediaStorageOptions>>().Value;
var mediaRoot = Path.GetFullPath(
    string.IsNullOrWhiteSpace(mediaOptions.RootPath)
        ? Path.Combine(app.Environment.ContentRootPath, "wwwroot", "uploads")
        : mediaOptions.RootPath);

Directory.CreateDirectory(mediaRoot);

var mediaContentTypes = new FileExtensionContentTypeProvider(
    new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        [".png"] = "image/png",
        [".jpg"] = "image/jpeg",
        [".jpeg"] = "image/jpeg",
        [".webp"] = "image/webp",
    });

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(mediaRoot),
    RequestPath = "/" + mediaOptions.PublicPathPrefix.Trim('/'),
    ContentTypeProvider = mediaContentTypes,
    ServeUnknownFileTypes = false,
    OnPrepareResponse = context =>
    {
        context.Context.Response.Headers.CacheControl = "public, max-age=31536000, immutable";
        context.Context.Response.Headers.XContentTypeOptions = "nosniff";
    },
});

app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

/*
 * Client-side routes fall through to the SPA shell. API paths must not: an
 * unmatched /api request has to look like a missing endpoint, not a 200 with an
 * HTML document that a JSON client cannot parse.
 */
var mediaRequestPath = "/" + mediaOptions.PublicPathPrefix.Trim('/');

app.MapFallback(context =>
{
    if (context.Request.Path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase))
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return Task.CompletedTask;
    }

    /*
     * A missing uploaded photo must 404 too. Answering with the SPA shell would
     * make an <img> silently render an HTML document, so a deleted file would
     * look like a styling fault rather than a missing file.
     */
    if (context.Request.Path.StartsWithSegments(mediaRequestPath, StringComparison.OrdinalIgnoreCase))
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return Task.CompletedTask;
    }

    context.Response.StatusCode = StatusCodes.Status200OK;
    context.Response.ContentType = "text/html";
    return context.Response.SendFileAsync(
        Path.Combine(app.Environment.WebRootPath ?? "wwwroot", "index.html"));
});

app.Run();

/// <summary>Exposed so the integration test host can reference the entry point.</summary>
public partial class Program;
