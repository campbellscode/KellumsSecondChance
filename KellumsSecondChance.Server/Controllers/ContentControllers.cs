using KellumsSecondChance.Server.Dtos;
using KellumsSecondChance.Server.Services;
using Microsoft.AspNetCore.Mvc;

namespace KellumsSecondChance.Server.Controllers;

/// <summary>
/// Public read endpoints.
///
/// All anonymous, all cacheable, all returning DTOs.
///
/// CACHING. Every response carries an ETag derived from
/// <see cref="IContentVersion"/>, which every admin content write bumps. The
/// max-age is deliberately short and paired with must-revalidate, so the worst
/// case after an administrator publishes something is one minute of staleness
/// — and the common case is a conditional request answered with an empty 304
/// rather than a fresh database round-trip.
///
/// Before this, a five-minute immutable window meant an owner could publish a
/// project and be unable to see it, with nothing in the console to explain why.
/// </summary>
[ApiController]
public abstract class PublicApiController(IContentVersion contentVersion) : ControllerBase
{
    protected const int PublicCacheSeconds = 60;

    /// <summary>
    /// Stamps the cache headers for a public read.
    ///
    /// Returns true when the caller's If-None-Match already matches the current
    /// content version, in which case the action should answer 304 and send no
    /// body at all.
    /// </summary>
    protected bool SetPublicCache()
    {
        var etag = contentVersion.Current;

        Response.Headers.ETag = etag;
        Response.Headers.CacheControl = $"public, max-age={PublicCacheSeconds}, must-revalidate";

        return Matches(Request.Headers.IfNoneMatch, etag);
    }

    /// <summary>The 304 answer: no body, headers already set.</summary>
    protected StatusCodeResult NotModified() => StatusCode(StatusCodes.Status304NotModified);

    /// <summary>
    /// Weak comparison per RFC 9110 §8.8.3.2 — a "W/" prefix on either side is
    /// ignored, and "*" matches anything the origin holds.
    /// </summary>
    private static bool Matches(IEnumerable<string?> ifNoneMatch, string etag)
    {
        foreach (var header in ifNoneMatch)
        {
            if (string.IsNullOrWhiteSpace(header)) continue;

            foreach (var candidate in header.Split(','))
            {
                var trimmed = candidate.Trim();
                if (trimmed == "*") return true;

                if (trimmed.StartsWith("W/", StringComparison.Ordinal)) trimmed = trimmed[2..];
                if (string.Equals(trimmed, etag, StringComparison.Ordinal)) return true;
            }
        }

        return false;
    }
}

[Route("api/services")]
public class ServicesController(IContentService content, IContentVersion version)
    : PublicApiController(version)
{
    /// <summary>Active services in display order.</summary>
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<ServiceSummaryDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ServiceSummaryDto>>> GetAll(CancellationToken ct)
    {
        if (SetPublicCache()) return NotModified();
        return Ok(await content.GetServicesAsync(ct));
    }

    /// <summary>A single service by SEO slug.</summary>
    [HttpGet("{slug}")]
    [ProducesResponseType<ServiceDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ServiceDetailDto>> GetBySlug(string slug, CancellationToken ct)
    {
        var service = await content.GetServiceAsync(slug, ct);
        if (service is null)
        {
            return Problem(
                title: "We could not find that service.",
                statusCode: StatusCodes.Status404NotFound);
        }

        if (SetPublicCache()) return NotModified();
        return Ok(service);
    }
}

[Route("api/projects")]
public class ProjectsController(IContentService content, IContentVersion version)
    : PublicApiController(version)
{
    /// <summary>Project summaries, optionally filtered.</summary>
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<ProjectSummaryDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ProjectSummaryDto>>> GetAll(
        [FromQuery] string? category,
        [FromQuery] bool featuredOnly = false,
        [FromQuery] string? search = null,
        [FromQuery] int? take = null,
        CancellationToken ct = default)
    {
        if (SetPublicCache()) return NotModified();
        return Ok(await content.GetProjectsAsync(category, featuredOnly, search, take, ct));
    }

    /// <summary>Distinct categories with counts, for the gallery filter bar.</summary>
    [HttpGet("categories")]
    [ProducesResponseType<IReadOnlyList<ProjectCategoryDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ProjectCategoryDto>>> GetCategories(CancellationToken ct)
    {
        if (SetPublicCache()) return NotModified();
        return Ok(await content.GetProjectCategoriesAsync(ct));
    }

    /// <summary>
    /// Featured projects that have a matched before/after pair, with their full
    /// image sets — the homepage comparison feature.
    /// </summary>
    [HttpGet("transformations")]
    [ProducesResponseType<IReadOnlyList<ProjectDetailDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ProjectDetailDto>>> GetTransformations(
        [FromQuery] int take = 4,
        CancellationToken ct = default)
    {
        if (SetPublicCache()) return NotModified();
        return Ok(await content.GetTransformationsAsync(take, ct));
    }

    /// <summary>A full case study by SEO slug.</summary>
    [HttpGet("{slug}")]
    [ProducesResponseType<ProjectDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProjectDetailDto>> GetBySlug(string slug, CancellationToken ct)
    {
        var project = await content.GetProjectAsync(slug, ct);
        if (project is null)
        {
            return Problem(
                title: "We could not find that project.",
                statusCode: StatusCodes.Status404NotFound);
        }

        if (SetPublicCache()) return NotModified();
        return Ok(project);
    }
}

[Route("api/testimonials")]
public class TestimonialsController(IContentService content, IContentVersion version)
    : PublicApiController(version)
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<TestimonialDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<TestimonialDto>>> GetAll(
        [FromQuery] bool featuredOnly = false,
        CancellationToken ct = default)
    {
        if (SetPublicCache()) return NotModified();
        return Ok(await content.GetTestimonialsAsync(featuredOnly, ct));
    }
}

[Route("api/faqs")]
public class FaqsController(IContentService content, IContentVersion version)
    : PublicApiController(version)
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<FaqItemDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<FaqItemDto>>> GetAll(CancellationToken ct)
    {
        if (SetPublicCache()) return NotModified();
        return Ok(await content.GetFaqsAsync(includePendingReview: false, ct));
    }
}

[Route("api/service-areas")]
public class ServiceAreasController(IContentService content, IContentVersion version)
    : PublicApiController(version)
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<ServiceAreaDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ServiceAreaDto>>> GetAll(CancellationToken ct)
    {
        if (SetPublicCache()) return NotModified();
        return Ok(await content.GetServiceAreasAsync(ct));
    }
}

[Route("api/site-content")]
public class SiteContentController(ISiteContentService siteContent, IContentVersion version)
    : PublicApiController(version)
{
    /// <summary>Business name, contact details, hours and social links.</summary>
    [HttpGet]
    [ProducesResponseType<SiteContentDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<SiteContentDto>> Get(CancellationToken ct)
    {
        if (SetPublicCache()) return NotModified();
        return Ok(await siteContent.GetAsync(ct));
    }
}
