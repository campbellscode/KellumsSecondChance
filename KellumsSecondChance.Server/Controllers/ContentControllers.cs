using KellumsSecondChance.Server.Dtos;
using KellumsSecondChance.Server.Services;
using Microsoft.AspNetCore.Mvc;

namespace KellumsSecondChance.Server.Controllers;

/// <summary>
/// Public read endpoints.
///
/// All anonymous, all cacheable, all returning DTOs. Responses carry a short
/// cache header so a repeat visit does not re-hit the database for content that
/// changes a few times a year.
/// </summary>
[ApiController]
public abstract class PublicApiController : ControllerBase
{
    protected const int PublicCacheSeconds = 300;

    protected void SetPublicCache()
    {
        Response.Headers.CacheControl = $"public, max-age={PublicCacheSeconds}";
    }
}

[Route("api/services")]
public class ServicesController(IContentService content) : PublicApiController
{
    /// <summary>Active services in display order.</summary>
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<ServiceSummaryDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ServiceSummaryDto>>> GetAll(CancellationToken ct)
    {
        SetPublicCache();
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

        SetPublicCache();
        return Ok(service);
    }
}

[Route("api/projects")]
public class ProjectsController(IContentService content) : PublicApiController
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
        SetPublicCache();
        return Ok(await content.GetProjectsAsync(category, featuredOnly, search, take, ct));
    }

    /// <summary>Distinct categories with counts, for the gallery filter bar.</summary>
    [HttpGet("categories")]
    [ProducesResponseType<IReadOnlyList<ProjectCategoryDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ProjectCategoryDto>>> GetCategories(CancellationToken ct)
    {
        SetPublicCache();
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
        SetPublicCache();
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

        SetPublicCache();
        return Ok(project);
    }
}

[Route("api/testimonials")]
public class TestimonialsController(IContentService content) : PublicApiController
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<TestimonialDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<TestimonialDto>>> GetAll(
        [FromQuery] bool featuredOnly = false,
        CancellationToken ct = default)
    {
        SetPublicCache();
        return Ok(await content.GetTestimonialsAsync(featuredOnly, ct));
    }
}

[Route("api/faqs")]
public class FaqsController(IContentService content) : PublicApiController
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<FaqItemDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<FaqItemDto>>> GetAll(CancellationToken ct)
    {
        SetPublicCache();
        return Ok(await content.GetFaqsAsync(includePendingReview: false, ct));
    }
}

[Route("api/service-areas")]
public class ServiceAreasController(IContentService content) : PublicApiController
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<ServiceAreaDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ServiceAreaDto>>> GetAll(CancellationToken ct)
    {
        SetPublicCache();
        return Ok(await content.GetServiceAreasAsync(ct));
    }
}

[Route("api/site-content")]
public class SiteContentController(ISiteContentService siteContent) : PublicApiController
{
    /// <summary>Business name, contact details, hours and social links.</summary>
    [HttpGet]
    [ProducesResponseType<SiteContentDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<SiteContentDto>> Get(CancellationToken ct)
    {
        SetPublicCache();
        return Ok(await siteContent.GetAsync(ct));
    }
}
